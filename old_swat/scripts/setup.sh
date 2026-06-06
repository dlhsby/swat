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
else
  echo "==> Loading database structure..."
  compose exec -T db mysql -uroot -p"${DB_ROOT_PW}" "${DB_NAME}" < "${STRUCTURE_SQL}"

  echo "==> Loading database data..."
  compose exec -T db mysql -uroot -p"${DB_ROOT_PW}" "${DB_NAME}" < "${DATA_SQL}"

  echo "    Database import complete."
fi

echo "==> Fixing writable permissions for cache/logs..."
compose exec -T app chmod -R 777 application/cache application/logs || true

echo ""
echo "============================================================"
echo "  SWAT is ready ->  http://localhost:${APP_PORT}/"
echo "  Adminer (DB UI) ->  http://localhost:${ADMINER_PORT}/  (server: db)"
echo "  MySQL exposed on localhost:${DB_PORT:-3306} (db: ${DB_NAME})"
echo "============================================================"
