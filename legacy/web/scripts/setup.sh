#!/usr/bin/env bash
#
# setup.sh — bring up the dockerized SWAT app and load its database.
#
# Usage:  bash old_swat/scripts/setup.sh
# Re-running is safe: the DB is only loaded once (skipped if already present).
#
set -euo pipefail

# Resolve paths relative to this script so it works from any CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INFRA_DIR="${APP_ROOT}/infra"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.yml"
# Two possible sources, newest preferred:
#   1. DUMP_DIR  — the current per-table, gzipped backup (structure + one .sql.gz
#      per table, produced by db/backup_swat.bat). This is the source of record.
#   2. BACKUP_DIR — the legacy single-file phpMyAdmin export (fallback only).
REPO_ROOT="$(cd "${APP_ROOT}/.." && pwd)"
DUMP_DIR="${REPO_ROOT}/db/dump"
STRUCTURE_GZ="${DUMP_DIR}/_structure.sql.gz"

BACKUP_DIR="${APP_ROOT}/db_backup"
STRUCTURE_SQL="${BACKUP_DIR}/dkp_swat_2026_05_18_structure.sql"
DATA_SQL="${BACKUP_DIR}/dkp_swat_2026_05_18_data.sql"

# Load config from infra/.env (falls back to .env.example defaults). The same
# file is what `docker compose` reads for variable substitution.
ENV_FILE="${INFRA_DIR}/.env"
[ -f "${ENV_FILE}" ] || ENV_FILE="${INFRA_DIR}/.env.example"
set -a; . "${ENV_FILE}"; set +a

DB_NAME="${MYSQL_DATABASE:-dkp_swat}"
DB_ROOT_PW="${MYSQL_ROOT_PASSWORD:-root}"
APP_PORT="${APP_PORT:-8080}"
ADMINER_PORT="${ADMINER_PORT:-8083}"

# docker compose (v2) vs docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi
compose() { "${DC[@]}" -f "${COMPOSE_FILE}" "$@"; }

echo "==> Building images and starting containers..."
compose up -d --build

echo "==> Waiting for MySQL to accept authenticated connections..."
# Note: 'mysqladmin ping' succeeds during MySQL's init-time temporary server,
# before the root password is applied — so we wait on a real authenticated query.
for i in $(seq 1 90); do
  if compose exec -T db mysql -uroot -p"${DB_ROOT_PW}" -e "SELECT 1" >/dev/null 2>&1; then
    echo "    MySQL is up."
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "ERROR: MySQL did not become ready in time." >&2
    compose logs db >&2 || true
    exit 1
  fi
  sleep 2
done

# Load the dumps only if the schema isn't already there (idempotent re-runs).
TABLE_COUNT="$(compose exec -T db mysql -uroot -p"${DB_ROOT_PW}" -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" 2>/dev/null | tr -d '[:space:]' || echo 0)"

if [ "${TABLE_COUNT:-0}" -gt 0 ]; then
  echo "==> Database '${DB_NAME}' already has ${TABLE_COUNT} tables — skipping import."
elif [ -f "${STRUCTURE_GZ}" ]; then
  # --- Preferred: per-table gzipped dump in db/dump/ -------------------------
  # The dump is latin1 (the legacy DB's charset); load it byte-faithfully.
  # _structure.sql.gz recreates all tables + stored routines; every other
  # *.sql.gz holds one table's data as REPLACE INTO. FK checks are disabled
  # inside the dumps, so load order among data files does not matter.
  load_gz() { gunzip -c "$1" | compose exec -T db \
    mysql -uroot -p"${DB_ROOT_PW}" --default-character-set=latin1 "${DB_NAME}"; }

  echo "==> Loading structure + routines from ${STRUCTURE_GZ##*/} ..."
  load_gz "${STRUCTURE_GZ}"

  echo "==> Loading per-table data from ${DUMP_DIR} ..."
  # Smallest files first so the quick tables finish before the multi-GB ones.
  for f in $(ls -1Sr "${DUMP_DIR}"/*.sql.gz | grep -v '/_structure\.sql\.gz$'); do
    printf '    %s ... ' "${f##*/}"
    if load_gz "$f"; then echo "ok"; else echo "FAILED" >&2; exit 1; fi
  done
  echo "    Database import complete (per-table dump)."
elif [ -f "${STRUCTURE_SQL}" ]; then
  # --- Fallback: legacy single-file phpMyAdmin export -----------------------
  echo "==> db/dump/ not found — falling back to legacy ${BACKUP_DIR##*/}/ export."
  echo "==> Loading database structure..."
  compose exec -T db mysql -uroot -p"${DB_ROOT_PW}" "${DB_NAME}" < "${STRUCTURE_SQL}"

  echo "==> Loading database data..."
  compose exec -T db mysql -uroot -p"${DB_ROOT_PW}" "${DB_NAME}" < "${DATA_SQL}"

  echo "    Database import complete."
else
  echo "ERROR: no dump found (looked for ${STRUCTURE_GZ} and ${STRUCTURE_SQL})." >&2
  exit 1
fi

echo "==> Fixing writable permissions for cache/logs..."
compose exec -T app chmod -R 777 application/cache application/logs || true

echo ""
echo "============================================================"
echo "  SWAT is ready ->  http://localhost:${APP_PORT}/"
echo "  Adminer (DB UI) ->  http://localhost:${ADMINER_PORT}/  (server: db)"
echo "  MySQL exposed on localhost:${DB_PORT:-3306} (db: ${DB_NAME})"
echo "============================================================"
