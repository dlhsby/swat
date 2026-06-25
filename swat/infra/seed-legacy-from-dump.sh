#!/usr/bin/env bash
#
# Seed a target PostgreSQL (e.g. staging) with the REAL legacy SWAT data —
# master records, users, roles/permissions (reconciled to the current app's
# permission catalog), sites, routes, vehicles, drivers, schedule + trip
# templates — by replaying the committed MySQL dump through `migrate:legacy`.
#
# By default it does NOT load transactional history (no Haul/Trip/TransactionDay
# rows): the standing plan is to import real legacy transactions later. Pass
# `--with-transactions` to additionally stream the transactional phase.
#
# Why this exists: `seed:staging` expects a live legacy MySQL (`dkp_swat`). We
# don't run one in the cloud, but the dump lives in-repo
# (old_swat/db_backup/). This script stands up a throwaway MySQL from that dump,
# points the migrator at it, and tears it down afterwards — so staging can be
# seeded from a full checkout with nothing but Docker + the target DATABASE_URL.
#
# Usage (run where the target Postgres is reachable — the box, or locally via an
# SSM/SSH tunnel to the staging RDS):
#
#   STAGING_DATABASE_URL='postgresql://USER:PASS@HOST:5432/swat?schema=public' \
#     bash infra/seed-legacy-from-dump.sh                 # master + users, no transactions
#   STAGING_DATABASE_URL=... bash infra/seed-legacy-from-dump.sh --with-transactions
#
# Optional env: LEGACY_SEED_PASSWORD (default Password123!) — password set on
# every migrated legacy user, forced reset on first login.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
DUMP_DIR="$REPO_ROOT/../old_swat/db_backup"
STRUCTURE_SQL="$DUMP_DIR/dkp_swat_2026_05_18_structure.sql"
DATA_SQL="$DUMP_DIR/dkp_swat_2026_05_18_data.sql"

MYSQL_CONTAINER="swat-legacy-dump-mysql"
MYSQL_PORT="${LEGACY_DB_PORT:-13306}"
MYSQL_ROOT_PW="legacydump"
MYSQL_DB="dkp_swat"
TMP_ENV="$BACKEND_DIR/.env.legacydump" # gitignored; cleaned up on exit
INCLUDE_TRANSACTIONS=""

for arg in "$@"; do
  case "$arg" in
    --with-transactions) INCLUDE_TRANSACTIONS="--include-transactions" ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "${STAGING_DATABASE_URL:-}" ]]; then
  echo "ERROR: STAGING_DATABASE_URL is required (target PostgreSQL connection string)." >&2
  exit 1
fi
for f in "$STRUCTURE_SQL" "$DATA_SQL"; do
  [[ -f "$f" ]] || { echo "ERROR: legacy dump not found: $f" >&2; exit 1; }
done

cleanup() {
  echo "Tearing down ephemeral MySQL + temp env…"
  docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
  rm -f "$TMP_ENV"
}
trap cleanup EXIT

echo "==> Starting ephemeral legacy MySQL (container: $MYSQL_CONTAINER, port: $MYSQL_PORT)…"
docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$MYSQL_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PW" \
  -e MYSQL_DATABASE="$MYSQL_DB" \
  -p "127.0.0.1:${MYSQL_PORT}:3306" \
  mysql:8.0 --default-authentication-plugin=mysql_native_password >/dev/null

echo "==> Waiting for MySQL to accept connections…"
for i in $(seq 1 60); do
  if docker exec "$MYSQL_CONTAINER" mysqladmin ping -uroot -p"$MYSQL_ROOT_PW" --silent >/dev/null 2>&1; then
    break
  fi
  [[ "$i" == "60" ]] && { echo "ERROR: MySQL did not become ready in time." >&2; exit 1; }
  sleep 2
done

echo "==> Importing legacy schema + data…"
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" "$MYSQL_DB" < "$STRUCTURE_SQL"
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" "$MYSQL_DB" < "$DATA_SQL"

echo "==> Writing temp migration env ($TMP_ENV)…"
cat > "$TMP_ENV" <<EOF
DATABASE_URL=$STAGING_DATABASE_URL
LEGACY_DB_HOST=127.0.0.1
LEGACY_DB_PORT=$MYSQL_PORT
LEGACY_DB_USER=root
LEGACY_DB_PASSWORD=$MYSQL_ROOT_PW
LEGACY_DB_NAME=$MYSQL_DB
LEGACY_SEED_PASSWORD=${LEGACY_SEED_PASSWORD:-Password123!}
EOF

echo "==> Running migrate:legacy ${INCLUDE_TRANSACTIONS:-(master + users, no transactions)}…"
# SEED_ENV=legacydump makes migrate-legacy load .env.legacydump (DATABASE_URL +
# LEGACY_DB_*) instead of the operator's .env.staging.
( cd "$REPO_ROOT" && \
  SEED_ENV=legacydump pnpm --filter @swat/backend run migrate:legacy -- ${INCLUDE_TRANSACTIONS} )

echo "==> Done. Legacy master + users loaded into the target database."
echo "    Transactions: ${INCLUDE_TRANSACTIONS:+IMPORTED}${INCLUDE_TRANSACTIONS:-SKIPPED (import later with --with-transactions).}"
