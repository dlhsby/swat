#!/usr/bin/env bash
#
# Restore a SEED ARTIFACT (built by build-seed-dump.sh) into a target PostgreSQL —
# the light, platform-agnostic half of a repeatable reseed. Run it WHERE THE TARGET
# DB IS LOCAL (the staging box for the AWS RDS; the prod server for on-prem) so the
# bulk COPY never crosses a slow tunnel. Needs only Docker (or a local psql) + the
# artifact + a SUPERUSER DATABASE_URL.
#
# Clean slate: it TRUNCATEs every migrated table, then restores the artifact with FK
# triggers disabled. The schema must already be at the same migration as the artifact
# (run `prisma migrate deploy` against the target first).
#
# Usage:
#   bash infra/restore-seed-dump.sh swat-seed-since-2025.sql.gz \
#        'postgresql://MASTER:PASS@HOST:5432/swat_staging?sslmode=require'
#
#   # superuser is needed for DISABLE TRIGGER / TRUNCATE — on AWS RDS use the master
#   # role (e.g. `kpi`), NOT the app role. On-prem use the prod superuser.
set -euo pipefail

DUMP="${1:-}"
URL="${2:-}"
[[ -n "$DUMP" && -n "$URL" ]] || { echo "Usage: restore-seed-dump.sh <dump.sql.gz> <SUPERUSER_DATABASE_URL>" >&2; exit 2; }
[[ -f "$DUMP" ]] || { echo "ERROR: artifact not found: $DUMP" >&2; exit 1; }

# psql: prefer a local client; else a throwaway postgres:15 container. We do NOT use
# --network host (it doesn't reach a WSL host's 127.0.0.1 tunnel, and timed out to RDS
# on the staging box). Instead: a default-bridge container reaches an external DB host
# (RDS / on-prem) via the host's NAT, and a 127.0.0.1 tunnel is reached by rewriting it
# to host.docker.internal (mapped to the host gateway).
PSQL_URL="$URL"
if command -v psql >/dev/null 2>&1; then
  PSQL() { psql "$PSQL_URL" "$@"; }
else
  echo "==> No local psql — using postgres:15 via Docker."
  case "$URL" in
    *@127.0.0.1:*|*@localhost:*) PSQL_URL="$(echo "$URL" | sed -E 's#@(127\.0\.0\.1|localhost):#@host.docker.internal:#')" ;;
  esac
  PSQL() { docker run --rm -i --add-host=host.docker.internal:host-gateway postgres:15 psql "$PSQL_URL" "$@"; }
fi

echo "==> Target: $(echo "$URL" | sed -E 's#://[^@]*@#://<creds>@#')"
echo "==> Sanity check + connection…"
PSQL "$URL" -v ON_ERROR_STOP=1 -tAc "SELECT 'connected to '||current_database();" || {
  echo "ERROR: cannot connect (is the DB reachable + the role a superuser?)." >&2; exit 1; }

echo "==> TRUNCATE all migrated tables (clean slate; keeps _prisma_migrations)…"
# Skip tables OWNED BY AN EXTENSION (pg_depend deptype='e') — on PostGIS that is
# spatial_ref_sys. It is not application data and pg_dump does not carry it in the
# artifact, so truncating it empties the SRID catalogue permanently: the TRUNCATE
# below is its own committed statement, so even a rolled-back load leaves it wiped.
# Every ::geography cast then fails with `Cannot find SRID (4326) in
# spatial_ref_sys`, silently, while health checks still pass.
TABLES="$(PSQL "$URL" -tAc \
  "SELECT string_agg(format('%I', t.tablename), ', ')
     FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename <> '_prisma_migrations'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
          JOIN pg_class c ON c.oid = d.objid
         WHERE d.deptype = 'e'
           AND c.relname = t.tablename
           AND c.relnamespace = 'public'::regnamespace)")"
[[ -n "$TABLES" ]] || { echo "ERROR: no tables found in target (run prisma migrate deploy first)." >&2; exit 1; }
PSQL "$URL" -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica; TRUNCATE TABLE ${TABLES} CASCADE;"

echo "==> Restoring artifact (FK triggers disabled)…"
# The artifact is --data-only --disable-triggers; prepend session_replication_role=replica
# as a belt-and-suspenders so FK checks stay off across the whole load. Single transaction
# so a failure rolls back to the (truncated) clean state rather than a half-load.
{ echo "SET session_replication_role = replica;"; gunzip -c "$DUMP"; } \
  | PSQL "$URL" -v ON_ERROR_STOP=1 --single-transaction -f -

echo "==> Done. Verifying a few counts…"
# Guard the invariant this script previously destroyed.
SRS="$(PSQL "$URL" -tAc "SELECT count(*) FROM spatial_ref_sys WHERE srid = 4326" | tr -d '[:space:]')"
if [[ "$SRS" != "1" ]]; then
  echo "ERROR: spatial_ref_sys is missing SRID 4326 — every ::geography cast will fail." >&2
  echo "       Repopulate it as the database owner before using this database." >&2
  exit 1
fi
echo "    spatial_ref_sys SRID 4326: present"
PSQL "$URL" -tAc "SELECT 'site='||(SELECT count(*) FROM site)||' route='||(SELECT count(*) FROM route)||' trip='||(SELECT count(*) FROM trip)||' haul='||(SELECT count(*) FROM haul)||' permit='||(SELECT count(*) FROM disposal_permit);"
echo "==> Restore complete."
