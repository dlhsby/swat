#!/usr/bin/env bash
#
# Regenerate the committed demo fixtures from a fresh legacy dump — run this after
# re-dumping the legacy DB into legacy/db/dump/. It refreshes:
#   1. the master snapshot   (prisma/legacy-*.json)            — from the gz dump directly
#   2. the curated subset    (prisma/demo-fixtures.ts)         — derived from (1)
#   3. sampled real txns     (prisma/demo-transactions.json)   — latest year, demo vehicles
#
# (3) needs SQL, so this stands up a throwaway MySQL 5.7 from the dump (like
# infra/seed-legacy-from-dump.sh) and tears it down afterwards. The outputs are
# committed and consumed by `seed:demo` — NO MySQL is needed at seed time.
#
# Usage:  bash infra/refresh-demo-fixtures.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_DIR="$REPO_ROOT/../legacy/db/dump"
STRUCTURE_GZ="$DUMP_DIR/_structure.sql.gz"
MYSQL_CONTAINER="swat-demo-fixtures-mysql"
MYSQL_PORT="${LEGACY_DB_PORT:-13308}" # distinct from the dev (:13306) and seed (:13307) MySQLs
MYSQL_ROOT_PW="legacydump"
MYSQL_DB="dkp_swat"
RUN="pnpm --filter @swat/backend exec ts-node --compiler-options {\"module\":\"CommonJS\"}"

[[ -f "$STRUCTURE_GZ" ]] || { echo "ERROR: dump not found: $STRUCTURE_GZ" >&2; exit 1; }

cleanup() { docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> [1/3] Master snapshot (legacy-*.json) from the gz dump…"
( cd "$REPO_ROOT" && $RUN prisma/scripts/generate-legacy-fixtures.ts )

echo "==> [2/3] Curated demo subset (demo-fixtures.ts)…"
( cd "$REPO_ROOT" && $RUN scripts/build-demo-fixtures.ts )

echo "==> [3/3] Sampled real transactions (demo-transactions.json) — standing up MySQL…"
docker rm -f "$MYSQL_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$MYSQL_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PW" -e MYSQL_DATABASE="$MYSQL_DB" \
  -p "127.0.0.1:${MYSQL_PORT}:3306" mysql:5.7 >/dev/null
for i in $(seq 1 90); do
  docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" -e 'SELECT 1' >/dev/null 2>&1 && break
  [[ "$i" == "90" ]] && { echo "ERROR: MySQL did not become ready." >&2; exit 1; }
  sleep 2
done
import_gz() { gunzip -c "$1" | docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PW" --default-character-set=latin1 "$MYSQL_DB"; }
import_gz "$STRUCTURE_GZ"
# Only the tables the transaction sampler touches (skip the multi-GB rest is not
# possible — it needs hari/transaksi/detail/trayek — but those import fine).
for f in $(ls -1Sr "$DUMP_DIR"/*.sql.gz | grep -v '/_structure\.sql\.gz$'); do import_gz "$f"; done

( cd "$REPO_ROOT" && \
  LEGACY_DB_HOST=127.0.0.1 LEGACY_DB_PORT="$MYSQL_PORT" LEGACY_DB_USER=root \
  LEGACY_DB_PASSWORD="$MYSQL_ROOT_PW" LEGACY_DB_NAME="$MYSQL_DB" \
  $RUN scripts/generate-demo-transaction-fixtures.ts )

echo "==> Done. Refreshed demo fixtures — review the diff and commit:"
echo "    apps/backend/prisma/legacy-*.json, demo-fixtures.ts, demo-transactions.json"
