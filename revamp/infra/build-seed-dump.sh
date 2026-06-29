#!/usr/bin/env bash
#
# Build a portable PostgreSQL SEED ARTIFACT from the legacy dump — the heavy ETL
# half of a repeatable staging/production reseed. Runs anywhere with Docker + this
# repo (a laptop, CI, a build box); does NOT touch any real target DB.
#
# It stands up throwaway MySQL (from legacy/db/dump/) + throwaway Postgres, runs the
# full `migrate:legacy` (master + auth + scheduling + aggregates + route completion +
# transactions) and the rollup backfill, then `pg_dump`s a data-only artifact and
# tears everything down. Restore it onto a target with `restore-seed-dump.sh`.
#
# Usage:
#   bash infra/build-seed-dump.sh                       # full history
#   bash infra/build-seed-dump.sh --since-year=2025     # 2025→ only (e.g. AWS free-tier staging)
#   bash infra/build-seed-dump.sh --since-year=2025 --out=/tmp/swat-seed-staging.sql.gz
#
# Why an artifact (vs. seed-legacy-from-dump.sh straight to the target): a constrained
# target (AWS free-tier RDS behind a private endpoint) is slow + flaky to bulk-load over
# a tunnel, and the small box can't host the 2 GB legacy MySQL. Build the data where
# there's room, restore the compact artifact where the DB is local.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_DIR="$REPO_ROOT/../legacy/db/dump"
STRUCTURE_GZ="$DUMP_DIR/_structure.sql.gz"
OUT_DIR="$REPO_ROOT/../legacy/db/seed-dumps"

MYSQL_CONTAINER="swat-seedbuild-mysql"
PG_CONTAINER="swat-seedbuild-pg"
MYSQL_PORT="${BUILD_MYSQL_PORT:-13309}"   # ≠ 13306/13307/13308 (other local MySQLs)
PG_PORT="${BUILD_PG_PORT:-15434}"         # ≠ 5432/15432/15433 (other local PGs/tunnel)
MYSQL_ROOT_PW="legacydump"
PG_PW="seedbuild"
MYSQL_DB="dkp_swat"
PG_DB="swat_seed"

SINCE_YEAR_ARG=""
OUT=""
for arg in "$@"; do
  case "$arg" in
    --since-year=*) SINCE_YEAR_ARG="$arg" ;;
    --out=*) OUT="${arg#--out=}" ;;
    *) echo "Unknown arg: $arg (expected --since-year=YYYY, --out=PATH)" >&2; exit 2 ;;
  esac
done
if [[ -z "$OUT" ]]; then
  mkdir -p "$OUT_DIR"
  suffix="${SINCE_YEAR_ARG#--since-year=}"; suffix="${suffix:+-since-$suffix}"
  OUT="$OUT_DIR/swat-seed${suffix:--full}.sql.gz"
fi
[[ -f "$STRUCTURE_GZ" ]] || { echo "ERROR: dump not found: $STRUCTURE_GZ" >&2; exit 1; }

cleanup() {
  echo "==> Tearing down throwaway MySQL + Postgres…"
  docker rm -f "$MYSQL_CONTAINER" "$PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Throwaway MySQL ($MYSQL_PORT) + Postgres ($PG_PORT)…"
docker rm -f "$MYSQL_CONTAINER" "$PG_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$MYSQL_CONTAINER" -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PW" -e MYSQL_DATABASE="$MYSQL_DB" \
  -p "127.0.0.1:${MYSQL_PORT}:3306" mysql:5.7 >/dev/null
docker run -d --name "$PG_CONTAINER" -e POSTGRES_USER=swat -e POSTGRES_PASSWORD="$PG_PW" -e POSTGRES_DB="$PG_DB" \
  -p "127.0.0.1:${PG_PORT}:5432" postgis/postgis:15-3.4 >/dev/null

echo "==> Waiting for MySQL + Postgres…"
for i in $(seq 1 90); do
  docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" -e 'SELECT 1' >/dev/null 2>&1 && break
  [[ "$i" == "90" ]] && { echo "ERROR: MySQL not ready." >&2; exit 1; }; sleep 2
done
for i in $(seq 1 60); do
  docker exec "$PG_CONTAINER" pg_isready -U swat >/dev/null 2>&1 && break
  [[ "$i" == "60" ]] && { echo "ERROR: Postgres not ready." >&2; exit 1; }; sleep 1
done

echo "==> Importing legacy dump into MySQL (structure first, then data smallest-first)…"
import_gz() { gunzip -c "$1" | docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" --default-character-set=latin1 "$MYSQL_DB"; }
import_gz "$STRUCTURE_GZ"
for f in $(ls -1Sr "$DUMP_DIR"/*.sql.gz | grep -v '/_structure\.sql\.gz$'); do import_gz "$f"; done

PG_URL="postgresql://swat:${PG_PW}@127.0.0.1:${PG_PORT}/${PG_DB}?schema=public"
echo "==> Schema (prisma migrate deploy)…"
( cd "$REPO_ROOT" && DATABASE_URL="$PG_URL" pnpm --filter @swat/backend exec prisma migrate deploy )

echo "==> ETL: migrate:legacy --force-reset --include-transactions ${SINCE_YEAR_ARG}…"
( cd "$REPO_ROOT" && \
  DATABASE_URL="$PG_URL" LEGACY_DB_HOST=127.0.0.1 LEGACY_DB_PORT="$MYSQL_PORT" LEGACY_DB_USER=root \
  LEGACY_DB_PASSWORD="$MYSQL_ROOT_PW" LEGACY_DB_NAME="$MYSQL_DB" LEGACY_SEED_PASSWORD="${LEGACY_SEED_PASSWORD:-Password123!}" \
  GOOGLE_MAPS_SERVER_KEY="${GOOGLE_MAPS_SERVER_KEY:-}" \
  NODE_OPTIONS=--max-old-space-size=4096 \
  pnpm --filter @swat/backend run migrate:legacy -- --force-reset --include-transactions --batch=20000 ${SINCE_YEAR_ARG} )
# ↑ migrate:legacy also runs the default-corridor backfill (road-snapped iff
#   GOOGLE_MAPS_SERVER_KEY is set above), so corridors are baked into the artifact.

echo "==> Rollup backfill (so dashboards work on the target)…"
( cd "$REPO_ROOT" && DATABASE_URL="$PG_URL" pnpm --filter @swat/backend run rollup:backfill ) || \
  echo "    (rollup backfill skipped/failed — non-fatal; can run on the target later)"

echo "==> pg_dump → ${OUT}…"
# Data-only, no --disable-triggers: on AWS RDS the master role (rds_superuser) can't
# DISABLE the FK *system* triggers it would emit. The restore instead sets
# `session_replication_role = replica` (which rds_superuser CAN) to skip FK checks
# during the COPY. --no-owner/--no-privileges keep it portable across roles.
docker exec "$PG_CONTAINER" pg_dump -U swat -d "$PG_DB" \
  --data-only --no-owner --no-privileges \
  --exclude-table='_prisma_migrations' \
  | gzip > "$OUT"

echo "==> Done. Seed artifact: $OUT ($(du -h "$OUT" | cut -f1))"
echo "    Restore with:  bash infra/restore-seed-dump.sh \"$OUT\" \"<TARGET_DATABASE_URL>\""
