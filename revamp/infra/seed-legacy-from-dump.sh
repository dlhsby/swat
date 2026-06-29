#!/usr/bin/env bash
#
# Seed a target PostgreSQL (staging UAT or on-prem production) with the REAL legacy
# SWAT data by replaying the committed per-table dump through `migrate:legacy`.
#
# It stands up a throwaway MySQL 5.7 from the gzipped per-table dump at
# `legacy/db/dump/` (structure first, then each table smallest-first), points the
# migrator at it, and tears it down afterwards — so a target can be seeded from a
# full checkout with nothing but Docker + the target DATABASE_URL.
#
# By default it loads master + users only (no Haul/Trip/TransactionDay history);
# pass `--with-transactions` to additionally stream the full transactional phase
# (~21M rows, keyset-batched + resumable).
#
# Usage (run where the target Postgres is reachable — the box, or locally via a tunnel):
#
#   # Staging (default target) — DATABASE_URL decrypted from infra/env/backend/.env.staging:
#   bash infra/seed-legacy-from-dump.sh staging                      # master + users
#   bash infra/seed-legacy-from-dump.sh staging --with-transactions  # + transactions
#
#   # Production cutover — DATABASE_URL from infra/env/backend/.env.production; guarded:
#   bash infra/seed-legacy-from-dump.sh production --with-transactions --confirm-production
#
#   # Explicit target (tunnel) wins over decryption:
#   TARGET_DATABASE_URL='postgresql://USER:PASS@127.0.0.1:15433/swat?schema=public' \
#     bash infra/seed-legacy-from-dump.sh staging --with-transactions
#
# Optional env: LEGACY_SEED_PASSWORD (default Password123!) — password set on every
# migrated legacy user, forced reset on first login.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
# The complete per-table gzipped dump (structure + one <table>.sql.gz per table).
DUMP_DIR="$REPO_ROOT/../legacy/db/dump"
STRUCTURE_GZ="$DUMP_DIR/_structure.sql.gz"

MYSQL_CONTAINER="swat-legacy-dump-mysql"
# 13307 (not 13306) avoids colliding with a local legacy `dkp_swat` dev MySQL on :13306.
MYSQL_PORT="${LEGACY_DB_PORT:-13307}"
MYSQL_ROOT_PW="legacydump"
MYSQL_DB="dkp_swat"
DOTENVX="$BACKEND_DIR/node_modules/.bin/dotenvx"

# ---- Parse args: first non-flag positional is the target env (staging|production). ----
TARGET_ENV="staging"
INCLUDE_TRANSACTIONS=""
CONFIRM_PRODUCTION=""
SINCE_YEAR_ARG=""
saw_target=""
for arg in "$@"; do
  case "$arg" in
    staging|production)
      [[ -n "$saw_target" ]] && { echo "Specify the target env once." >&2; exit 2; }
      TARGET_ENV="$arg"; saw_target=1 ;;
    --with-transactions) INCLUDE_TRANSACTIONS="--include-transactions" ;;
    --confirm-production) CONFIRM_PRODUCTION="--confirm-production" ;;
    # Load only this year onward of date-scoped data (e.g. --since-year=2025) — for a
    # constrained target like AWS free-tier RDS. Masters still load in full.
    --since-year=*) SINCE_YEAR_ARG="$arg" ;;
    *) echo "Unknown argument: $arg (expected staging|production, --with-transactions, --confirm-production, --since-year=YYYY)" >&2; exit 2 ;;
  esac
done

ENCRYPTED_ENV="$REPO_ROOT/infra/env/backend/.env.$TARGET_ENV"
# An explicit override wins (e.g. a 127.0.0.1 tunnel URL). Per-env var name first,
# then the generic TARGET_DATABASE_URL.
if [[ "$TARGET_ENV" == "production" ]]; then
  OVERRIDE_URL="${PROD_DATABASE_URL:-${TARGET_DATABASE_URL:-}}"
  # The migrator also refuses a production run without --confirm-production; require it here
  # too so we never stand up MySQL / truncate a production target by accident.
  [[ -n "$CONFIRM_PRODUCTION" ]] || {
    echo "ERROR: production target requires --confirm-production (refusing to touch production)." >&2; exit 1; }
else
  OVERRIDE_URL="${STAGING_DATABASE_URL:-${TARGET_DATABASE_URL:-}}"
fi

DATABASE_URL="$OVERRIDE_URL"
if [[ -z "$DATABASE_URL" ]]; then
  [[ -x "$DOTENVX" && -f "$ENCRYPTED_ENV" ]] || {
    echo "ERROR: set ${TARGET_ENV^^}_DATABASE_URL/TARGET_DATABASE_URL, or ensure $ENCRYPTED_ENV + dotenvx exist to decrypt it." >&2; exit 1; }
  DATABASE_URL="$("$DOTENVX" get DATABASE_URL -f "$ENCRYPTED_ENV" 2>/dev/null)"
  [[ -n "$DATABASE_URL" ]] || {
    echo "ERROR: could not decrypt DATABASE_URL from $ENCRYPTED_ENV (need the dotenvx private key)." >&2; exit 1; }
  echo "==> DATABASE_URL decrypted from $ENCRYPTED_ENV"
fi
export DATABASE_URL

[[ -f "$STRUCTURE_GZ" ]] || { echo "ERROR: dump not found: $STRUCTURE_GZ (run a fresh backup into legacy/db/dump/)." >&2; exit 1; }

cleanup() {
  echo "Tearing down ephemeral MySQL…"
  docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Target: $TARGET_ENV | transactions: ${INCLUDE_TRANSACTIONS:-no}"
echo "==> Starting ephemeral legacy MySQL (container: $MYSQL_CONTAINER, port: $MYSQL_PORT)…"
docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$MYSQL_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PW" \
  -e MYSQL_DATABASE="$MYSQL_DB" \
  -p "127.0.0.1:${MYSQL_PORT}:3306" \
  mysql:5.7 >/dev/null
# mysql:5.7 (NOT 8.0): the dump is a MySQL 5.6 latin1 mysqldump; 8.0 is stricter and
# silently fails some CREATE TABLEs, so the ETL later errors on a missing table.

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

# Import the per-table dump latin1-faithfully: structure (tables + routines) first, then
# every table's data smallest-first (so the quick tables land before the multi-GB ones).
import_gz() {
  gunzip -c "$1" | docker exec -i "$MYSQL_CONTAINER" \
    mysql -uroot -p"$MYSQL_ROOT_PW" --default-character-set=latin1 "$MYSQL_DB"
}
echo "==> Importing structure + routines (${STRUCTURE_GZ##*/})…"
import_gz "$STRUCTURE_GZ"
echo "==> Importing per-table data…"
for f in $(ls -1Sr "$DUMP_DIR"/*.sql.gz | grep -v '/_structure\.sql\.gz$'); do
  printf '    %s … ' "${f##*/}"
  if import_gz "$f"; then echo ok; else echo FAILED; exit 1; fi
done

# Source creds for the ephemeral MySQL, exported into the migrator's env. DATABASE_URL (target)
# is already exported above. No env file is written.
export LEGACY_DB_HOST=127.0.0.1
export LEGACY_DB_PORT="$MYSQL_PORT"
export LEGACY_DB_USER=root
export LEGACY_DB_PASSWORD="$MYSQL_ROOT_PW"
export LEGACY_DB_NAME="$MYSQL_DB"
export LEGACY_SEED_PASSWORD="${LEGACY_SEED_PASSWORD:-Password123!}"
# Belt-and-suspenders: the transactional phase streams in keyset batches (tens of MB), but
# give Node generous headroom for the parent-resolution maps on a full-volume load.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"

echo "==> Running migrate:legacy (env=$TARGET_ENV) --force-reset ${INCLUDE_TRANSACTIONS:-(master + users, no transactions)}…"
# --force-reset truncates + reloads the migrated tables, so reseeding a dirty target is clean.
# SEED_ENV=$TARGET_ENV tells migrate:legacy to trust the exported DATABASE_URL + LEGACY_DB_*
# (and NOT load prisma/.env, whose dev DATABASE_URL would shadow the target).
( cd "$REPO_ROOT" && \
  SEED_ENV="$TARGET_ENV" pnpm --filter @swat/backend run migrate:legacy -- \
    --force-reset ${INCLUDE_TRANSACTIONS} ${CONFIRM_PRODUCTION} ${SINCE_YEAR_ARG} )

# Master-only: --force-reset only truncates the phases it runs, so the (skipped) transaction
# tables keep any pre-existing rows — e.g. old synthetic demo days. Clear them so a master-only
# target is genuinely transaction-free. (Prisma 7 `migrate reset` can't skip the seed, and
# DROP SCHEMA CASCADE overflows the partitioned tables' lock budget — TRUNCATE is the right tool.)
if [[ -z "$INCLUDE_TRANSACTIONS" ]]; then
  echo "==> Clearing transaction tables (master-only target)…"
  echo "TRUNCATE TABLE transaction_day, haul, haul_assignment, trip, tpa_inbound_log RESTART IDENTITY CASCADE;" \
    | ( cd "$REPO_ROOT" && pnpm --filter @swat/backend exec prisma db execute --stdin )
fi

echo "==> Done. Legacy master + users loaded into the $TARGET_ENV database."
echo "    Transactions: ${INCLUDE_TRANSACTIONS:+IMPORTED}${INCLUDE_TRANSACTIONS:-CLEARED (none; import later with --with-transactions).}"
echo "    Next: pnpm --filter @swat/backend run migrate:verify  (reconcile counts; run before archiving)."
