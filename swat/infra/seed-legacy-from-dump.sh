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
# 13307 (not 13306) avoids colliding with a local legacy `dkp_swat` dev MySQL on :13306.
MYSQL_PORT="${LEGACY_DB_PORT:-13307}"
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
  mysql:5.7 >/dev/null
# mysql:5.7 (NOT 8.0): the dump is a MySQL 5.6 latin1 mysqldump; 8.0 is stricter and silently
# fails some CREATE TABLEs (e.g. aplikasikendaraan), so the ETL later errors on a missing table.

echo "==> Waiting for MySQL to accept AUTHENTICATED connections…"
# Probe with a real query, NOT `mysqladmin ping`: ping succeeds against the image's init-phase
# temp server before the root password is active, so the import would hit "Access denied".
for i in $(seq 1 90); do
  if docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" -e 'SELECT 1' >/dev/null 2>&1; then
    break
  fi
  [[ "$i" == "90" ]] && { echo "ERROR: MySQL did not become ready in time." >&2; exit 1; }
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

echo "==> Running migrate:legacy --force-reset ${INCLUDE_TRANSACTIONS:-(master + users, no transactions)}…"
# --force-reset truncates + reloads the migrated MASTER tables, so reseeding a dirty target is
# clean. SEED_ENV=legacydump loads .env.legacydump (DATABASE_URL + LEGACY_DB_*), not the
# operator's .env.staging.
( cd "$REPO_ROOT" && \
  SEED_ENV=legacydump pnpm --filter @swat/backend run migrate:legacy -- --force-reset ${INCLUDE_TRANSACTIONS} )

# Master-only: --force-reset only truncates the phases it runs, so the (skipped) transaction
# tables keep any pre-existing rows — e.g. old synthetic demo days. Clear them so a master-only
# target is genuinely transaction-free. (Prisma 7 `migrate reset` can't skip the seed, and
# DROP SCHEMA CASCADE overflows the partitioned tables' lock budget — TRUNCATE is the right tool.)
if [[ -z "$INCLUDE_TRANSACTIONS" ]]; then
  echo "==> Clearing transaction tables (master-only target)…"
  echo "TRUNCATE TABLE transaction_day, haul, haul_assignment, trip, tpa_inbound_log RESTART IDENTITY CASCADE;" \
    | ( cd "$REPO_ROOT" && DATABASE_URL="$STAGING_DATABASE_URL" pnpm --filter @swat/backend exec prisma db execute --stdin )
fi

echo "==> Done. Legacy master + users loaded into the target database."
echo "    Transactions: ${INCLUDE_TRANSACTIONS:+IMPORTED}${INCLUDE_TRANSACTIONS:-CLEARED (none; import later with --with-transactions).}"
