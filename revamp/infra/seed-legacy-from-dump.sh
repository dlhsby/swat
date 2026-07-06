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
# Resumable, interruption-safe flow (fragile link / big load / production cutover):
#
#   # 1) Load MySQL once + full masters/users, keep MySQL alive, skip the no-op corridor step:
#   bash infra/seed-legacy-from-dump.sh staging --keep-mysql --skip-corridors
#   # 2) Stream transactions, resuming from the watermark, reusing the loaded MySQL, auto-retrying.
#   #    Re-run this exact line after ANY interruption — it continues, never restarts from zero.
#   bash infra/seed-legacy-from-dump.sh staging --with-transactions --transactions-only \
#     --resume --reuse-mysql --keep-mysql --since-year=2024 --retry
#
# Opt-in flags (defaults preserve the original one-shot behaviour):
#   --resume            continue from watermark; do NOT --force-reset (no truncate)
#   --transactions-only skip master/auth/scheduling; go straight to the txn load
#   --skip-corridors    skip the route-corridor backfill
#   --reuse-mysql       reuse an already-loaded ephemeral MySQL instead of re-importing (~15 min)
#   --keep-mysql        don't tear MySQL down on exit, so the next resume reuses it
#   --retry[=N]         re-invoke the migrator on failure (resuming from watermark), up to N times
#   --since-year=YYYY   window the 5 transactional tables to this year onward (masters stay full)
#   --skip-backfill     don't refresh the monitoring rollups after the txn load (default: refresh)
#   --skip-archive      don't archive >13-month partitions after the backfill (default: run, but it
#                       safely no-ops unless pg_dump + a writable ARCHIVE_DIR are present)
#
# After a transactional load the script auto-runs `rollup:backfill` (so monitoring dashboards read
# non-empty) then `archive:run` (13-month retention) — order matters; archiving skips months whose
# rollups aren't backfilled yet. Both are non-fatal to the seed and skippable via the flags above.
#
# All output is also appended to apps/backend/scripts/migration/reports/reseed-<env>.log (durable).
# Launch detached so a terminal/session teardown can't kill it:
#   setsid nohup bash infra/seed-legacy-from-dump.sh staging … >/dev/null 2>&1 &
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
# Opt-in resumability flags (defaults preserve the original one-shot behaviour):
RESUME=""            # --resume: continue from watermark, do NOT --force-reset (no truncate).
TRANSACTIONS_ONLY="" # --transactions-only: skip master/auth/scheduling; go straight to the txn load.
SKIP_CORRIDORS=""    # --skip-corridors: skip the (currently no-op) route-corridor backfill.
REUSE_MYSQL=""       # --reuse-mysql: reuse an already-loaded ephemeral MySQL instead of re-importing.
KEEP_MYSQL=""        # --keep-mysql: don't tear the MySQL container down on exit (next resume reuses it).
RETRY_MAX="0"        # --retry[=N]: re-invoke the migrator on failure (resuming) up to N times.
SKIP_BACKFILL=""     # --skip-backfill: don't run the monitoring rollup backfill after the txn load.
SKIP_ARCHIVE=""      # --skip-archive: don't run partition archiving after the backfill.
saw_target=""
ORIGINAL_ARGS="$*"
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
    --resume) RESUME="--resume" ;;
    --transactions-only) TRANSACTIONS_ONLY="--transactions-only" ;;
    --skip-corridors) SKIP_CORRIDORS="--skip-corridors" ;;
    --reuse-mysql) REUSE_MYSQL=1 ;;
    --keep-mysql) KEEP_MYSQL=1 ;;
    --retry) RETRY_MAX=5 ;;
    --retry=*) RETRY_MAX="${arg#--retry=}" ;;
    --skip-backfill) SKIP_BACKFILL=1 ;;
    --skip-archive) SKIP_ARCHIVE=1 ;;
    *) echo "Unknown argument: $arg (expected staging|production, --with-transactions, --confirm-production, --since-year=YYYY, --resume, --transactions-only, --skip-corridors, --reuse-mysql, --keep-mysql, --retry[=N], --skip-backfill, --skip-archive)" >&2; exit 2 ;;
  esac
done

# --resume continues from the watermark, so it must NOT truncate. Absent --resume, keep the
# original clean-reseed behaviour (--force-reset truncates + reloads the migrated tables).
if [[ -n "$RESUME" ]]; then
  RESET_FLAG=""
else
  RESET_FLAG="--force-reset"
fi

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

# Durable log: mirror all output to an in-repo file that survives a /tmp wipe (WSL crash) and a
# detached (setsid nohup) launch, so progress/errors are recoverable after any interruption.
LOG_DIR="$BACKEND_DIR/scripts/migration/reports"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/reseed-$TARGET_ENV.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "===== reseed $(date '+%Y-%m-%d %H:%M:%S %z') | target=$TARGET_ENV | args: ${ORIGINAL_ARGS:-(none)} ====="

cleanup() {
  if [[ -n "$KEEP_MYSQL" ]]; then
    echo "Keeping ephemeral MySQL ($MYSQL_CONTAINER) alive for the next resume (--keep-mysql)."
    return
  fi
  echo "Tearing down ephemeral MySQL…"
  docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Target: $TARGET_ENV | transactions: ${INCLUDE_TRANSACTIONS:-no} | resume: ${RESUME:-no} | reuse-mysql: ${REUSE_MYSQL:+yes} | keep-mysql: ${KEEP_MYSQL:+yes}"

import_gz() {
  gunzip -c "$1" | docker exec -i "$MYSQL_CONTAINER" \
    mysql -uroot -p"$MYSQL_ROOT_PW" --default-character-set=latin1 "$MYSQL_DB"
}

# mysql_is_loaded: the container is up AND the data is present (trayek has rows). Used to skip the
# ~15-min re-import — whether the data persists in a running container (--keep-mysql) or on a
# bind-mounted datadir that outlived the container (LEGACY_MYSQL_DATADIR).
mysql_is_loaded() {
  docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER" || return 1
  local n
  n="$(docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" -N -B \
        -e "SELECT COUNT(*) FROM $MYSQL_DB.trayek" 2>/dev/null || echo 0)"
  [[ "$n" =~ ^[0-9]+$ && "$n" -gt 0 ]]
}

# LEGACY_MYSQL_DATADIR: bind-mount MySQL's data dir to a host path (put it on a disk with room —
# the dump balloons to ~10-15GB in InnoDB). This keeps the big import OFF Docker's data VHD (which,
# on Docker Desktop/WSL2, lives on the Windows C: drive and is a common out-of-disk crash cause).
# The datadir also PERSISTS across container death, so a crash never forces a re-import.
DATADIR_ARGS=()
if [[ -n "${LEGACY_MYSQL_DATADIR:-}" ]]; then
  mkdir -p "$LEGACY_MYSQL_DATADIR"
  DATADIR_ARGS=(-v "$LEGACY_MYSQL_DATADIR:/var/lib/mysql")
  echo "==> MySQL datadir → $LEGACY_MYSQL_DATADIR (keeps the big import off Docker's/C: disk; persists across crashes)."
fi

# Ensure the container is up (create it if missing), mounting the datadir if configured.
if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo "==> Starting ephemeral legacy MySQL (container: $MYSQL_CONTAINER, port: $MYSQL_PORT)…"
  docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
  # --memory=2g bounds host RAM so a big import can't OOM the box (a repeated crash cause).
  # The innodb/binlog flags trade durability for a much faster, lighter one-time bulk import
  # (safe: the container is throwaway). mysql:5.7 (NOT 8.0): the dump is a MySQL 5.6 latin1
  # mysqldump; 8.0 is stricter and silently fails some CREATE TABLEs → the ETL errors later.
  docker run -d --name "$MYSQL_CONTAINER" \
    --memory=2g \
    "${DATADIR_ARGS[@]}" \
    -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PW" \
    -e MYSQL_DATABASE="$MYSQL_DB" \
    -p "127.0.0.1:${MYSQL_PORT}:3306" \
    mysql:5.7 \
    --innodb-buffer-pool-size=768M \
    --innodb-flush-log-at-trx-commit=2 \
    --innodb-doublewrite=0 \
    --sync-binlog=0 \
    --skip-log-bin >/dev/null

  echo "==> Waiting for MySQL to accept AUTHENTICATED connections…"
  # Probe with a real query, NOT `mysqladmin ping`: ping succeeds against the image's init-phase
  # temp server before the root password is active, so the import would hit "Access denied".
  for i in $(seq 1 120); do
    if docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" -e 'SELECT 1' >/dev/null 2>&1; then
      break
    fi
    [[ "$i" == "120" ]] && { echo "ERROR: MySQL did not become ready in time." >&2; exit 1; }
    sleep 2
  done
fi

# Skip the import when the data is already present — a running loaded container (--reuse-mysql) OR a
# populated bind-mounted datadir that survived a crash. Otherwise import the dump.
if mysql_is_loaded && { [[ -n "$REUSE_MYSQL" ]] || [[ -n "${LEGACY_MYSQL_DATADIR:-}" ]]; }; then
  echo "==> MySQL already loaded (trayek has rows); skipping import."
else
  # Import the per-table dump latin1-faithfully: structure (tables + routines) first, then
  # every table's data smallest-first (so the quick tables land before the multi-GB ones).
  echo "==> Importing structure + routines (${STRUCTURE_GZ##*/})…"
  import_gz "$STRUCTURE_GZ"
  echo "==> Importing per-table data…"
  for f in $(ls -1Sr "$DUMP_DIR"/*.sql.gz | grep -v '/_structure\.sql\.gz$'); do
    printf '    %s … ' "${f##*/}"
    if import_gz "$f"; then echo ok; else echo FAILED; exit 1; fi
  done
fi

# Source creds for the ephemeral MySQL, exported into the migrator's env. DATABASE_URL (target)
# is already exported above. No env file is written.
export LEGACY_DB_HOST=127.0.0.1
export LEGACY_DB_PORT="$MYSQL_PORT"
export LEGACY_DB_USER=root
export LEGACY_DB_PASSWORD="$MYSQL_ROOT_PW"
export LEGACY_DB_NAME="$MYSQL_DB"
export LEGACY_SEED_PASSWORD="${LEGACY_SEED_PASSWORD:-Password123!}"
# The transactional phase streams in keyset batches (tens of MB) and preloads only small master
# maps, so 2GB of heap is ample — keeping it modest leaves host RAM for MySQL + the tunnel.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048"

# Assemble the migrator flags: default is a clean reseed (--force-reset); --resume swaps that for
# a watermark-continue, --transactions-only/--skip-corridors/--since-year narrow the work.
MIGRATE_FLAGS=(${RESET_FLAG} ${RESUME} ${TRANSACTIONS_ONLY} ${INCLUDE_TRANSACTIONS} ${SKIP_CORRIDORS} ${CONFIRM_PRODUCTION} ${SINCE_YEAR_ARG})

run_migrator() {
  # SEED_ENV=$TARGET_ENV tells migrate:legacy to trust the exported DATABASE_URL + LEGACY_DB_*
  # (and NOT load prisma/.env, whose dev DATABASE_URL would shadow the target).
  ( cd "$REPO_ROOT" && \
    SEED_ENV="$TARGET_ENV" pnpm --filter @swat/backend run migrate:legacy -- "${MIGRATE_FLAGS[@]}" )
}

echo "==> Running migrate:legacy (env=$TARGET_ENV) flags: ${MIGRATE_FLAGS[*]:-(master + users, no transactions)}…"
attempt=0
until run_migrator; do
  rc=$?
  attempt=$((attempt + 1))
  if [[ "$RETRY_MAX" -le 0 || "$attempt" -gt "$RETRY_MAX" ]]; then
    echo "ERROR: migrate:legacy failed (exit $rc); retries exhausted ($attempt/${RETRY_MAX})." >&2
    exit "$rc"
  fi
  # Every retry resumes from the watermark and never re-truncates — so even a first --force-reset
  # run that dies partway continues cleanly rather than restarting from zero.
  RESET_FLAG=""
  RESUME="--resume"
  MIGRATE_FLAGS=(${RESUME} ${TRANSACTIONS_ONLY} ${INCLUDE_TRANSACTIONS} ${SKIP_CORRIDORS} ${CONFIRM_PRODUCTION} ${SINCE_YEAR_ARG})
  backoff=$((attempt * 10))
  echo "WARN: migrate:legacy failed (exit $rc); retry $attempt/${RETRY_MAX} in ${backoff}s (resumes from watermark)…" >&2
  sleep "$backoff"
done

# Master-only: --force-reset only truncates the phases it runs, so the (skipped) transaction
# tables keep any pre-existing rows — e.g. old synthetic demo days. Clear them so a master-only
# target is genuinely transaction-free. Skip when resuming (never nuke an in-progress txn load).
# (Prisma 7 `migrate reset` can't skip the seed, and DROP SCHEMA CASCADE overflows the
# partitioned tables' lock budget — TRUNCATE is the right tool.)
if [[ -z "$INCLUDE_TRANSACTIONS" && -z "$RESUME" && -z "$TRANSACTIONS_ONLY" ]]; then
  echo "==> Clearing transaction tables (master-only target)…"
  echo "TRUNCATE TABLE transaction_day, haul, haul_assignment, trip, tpa_inbound_log RESTART IDENTITY CASCADE;" \
    | ( cd "$REPO_ROOT" && pnpm --filter @swat/backend exec prisma db execute --stdin )
fi

# After a transactional load, refresh the monitoring rollups then archive old partitions —
# so the reseed leaves a fully-usable target (monitoring dashboards populated + retention applied).
# The migrator writes only the raw haul/trip tables; the dashboards read rollups (daily_tonnage,
# monthly_*), and the 13-month retention lives in the archive catalog — neither is touched by the
# ETL, so they must run here. ORDER MATTERS: backfill first (archiving skips months whose rollups
# are incomplete). Both are non-fatal to the seed (the data load already succeeded) but logged.
if [[ -n "$INCLUDE_TRANSACTIONS" ]]; then
  if [[ -z "$SKIP_BACKFILL" ]]; then
    echo "==> Backfilling monitoring rollups (daily_tonnage + monthly_*) from loaded transactions…"
    if ! ( cd "$REPO_ROOT" && SEED_ENV="$TARGET_ENV" pnpm --filter @swat/backend run rollup:backfill ); then
      echo "WARN: rollup:backfill failed — monitoring dashboards may read empty until it is re-run." >&2
    fi
  fi
  if [[ -z "$SKIP_ARCHIVE" ]]; then
    echo "==> Archiving partitions older than the 13-month retention window…"
    # run-archive.ts pre-flights pg_dump + ARCHIVE_DIR and safely no-ops if absent (so an
    # over-tunnel staging load never orphans a partition); it archives for real on the prod box.
    if ! ( cd "$REPO_ROOT" && SEED_ENV="$TARGET_ENV" pnpm --filter @swat/backend run archive:run ); then
      echo "WARN: archive:run reported a failure — check for a detached-but-unarchived partition." >&2
    fi
  fi
fi

echo "==> Done. Legacy master + users loaded into the $TARGET_ENV database."
echo "    Transactions: ${INCLUDE_TRANSACTIONS:+IMPORTED}${INCLUDE_TRANSACTIONS:-CLEARED (none; import later with --with-transactions).}"
echo "    Monitoring rollups: ${INCLUDE_TRANSACTIONS:+${SKIP_BACKFILL:+SKIPPED (--skip-backfill)}${SKIP_BACKFILL:-backfilled}}${INCLUDE_TRANSACTIONS:-n/a (no transactions)}"
echo "    Archiving: ${INCLUDE_TRANSACTIONS:+${SKIP_ARCHIVE:+SKIPPED (--skip-archive)}${SKIP_ARCHIVE:-ran (no-op unless pg_dump + ARCHIVE_DIR present)}}${INCLUDE_TRANSACTIONS:-n/a}"
echo "    Verify counts (optional; reports expected drift for a --since-year window):"
echo "      pnpm --filter @swat/backend run migrate:verify"
