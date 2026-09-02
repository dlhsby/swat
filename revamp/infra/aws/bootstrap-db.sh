#!/usr/bin/env bash
# Create the SWAT application database + role and enable PostGIS on the staging RDS.
#
# Runs ON THE BOX via SSM Run Command: the RDS instance is PubliclyAccessible=false,
# so there is nothing to reach from a laptop without a tunnel — and the SSM
# port-forward tunnel is the fragile path this project already moved away from.
#
# Idempotent: every statement is guarded, so re-running is safe.
#
# Two preconditions this exists to satisfy, both of which fail the FIRST
# `prisma migrate deploy` if missing:
#   1. PostGIS. Migration 20260625000000_enable_postgis runs `CREATE EXTENSION
#      postgis`, which the app role is not privileged to do on RDS.
#   2. spatial_ref_sys / SRID 4326. RDS ships PostGIS with an UNPOPULATED
#      spatial_ref_sys, which breaks every ::geography cast with
#      "Cannot find SRID (4326) in spatial_ref_sys". Migration
#      20260706000000_ensure_spatial_ref_sys_4326 tries to fix it but skips
#      non-fatally when the migrating role lacks INSERT — so the master does it here.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

APP_PW="${SWAT_APP_DB_PASSWORD:-}"
if [[ -z "$APP_PW" ]]; then
  APP_PW="$(aws secretsmanager get-random-password --exclude-punctuation \
    --password-length 32 --query RandomPassword --output text 2>/dev/null \
    || LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)"
  echo "Generated a new application role password."
fi
# Store it so DATABASE_URL can be rebuilt later without a reset.
aws ssm put-parameter --name "${SSM_PREFIX}/APP_DB_PASSWORD" --type SecureString \
  --value "$APP_PW" --overwrite >/dev/null

INSTANCE_ID="$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${INSTANCE_NAME}" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)"
[[ "$INSTANCE_ID" != "None" && -n "$INSTANCE_ID" ]] || { echo "ERROR: no running $INSTANCE_NAME instance." >&2; exit 1; }

say "Bootstrapping $TARGET_DB on the RDS via SSM (instance $INSTANCE_ID)"

# The password reaches the box as a base64 blob inside the command and is used
# only to build a libpq URL in a shell variable — it is never written to a file.
REMOTE=$(cat <<REMOTESCRIPT
set -euo pipefail
export AWS_DEFAULT_REGION=${REGION}
get() { aws ssm get-parameter --name "\$1" --with-decryption --query Parameter.Value --output text; }
HOST="\$(get ${SSM_PREFIX}/RDS_HOST)"
MUSER="\$(get ${SSM_PREFIX}/RDS_MASTER_USERNAME)"
MPW="\$(get ${SSM_PREFIX}/RDS_MASTER_PASSWORD)"
APPPW="\$(get ${SSM_PREFIX}/APP_DB_PASSWORD)"
export PGPASSWORD="\$MPW"
PSQL="psql --set=ON_ERROR_STOP=1 -h \$HOST -U \$MUSER"

# --- role + database (idempotent) ---
\$PSQL -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${APP_DB_ROLE}'" | grep -q 1 \\
  || \$PSQL -d postgres -c "CREATE ROLE ${APP_DB_ROLE} LOGIN PASSWORD '\$APPPW'"
# Always resync the password so SSM and the DB cannot drift apart.
\$PSQL -d postgres -c "ALTER ROLE ${APP_DB_ROLE} WITH LOGIN PASSWORD '\$APPPW'"

# The RDS master is NOT a superuser. It must be a MEMBER of the app role to act on
# objects the app role owns (TRUNCATE during a reseed, and REASSIGN OWNED if the
# tables ever end up owned by the wrong role). GRANT ALL is not a substitute for
# membership — that distinction cost the sibling project hours.
\$PSQL -d postgres -c "GRANT ${APP_DB_ROLE} TO \$MUSER"

\$PSQL -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" | grep -q 1 \\
  || \$PSQL -d postgres -c "CREATE DATABASE ${TARGET_DB} OWNER ${APP_DB_ROLE}"

# --- PostGIS, as the master (the app role cannot CREATE EXTENSION) ---
\$PSQL -d ${TARGET_DB} -c "CREATE EXTENSION IF NOT EXISTS postgis"

# RDS leaves spatial_ref_sys empty; seed SRID 4326 or every ::geography cast fails.
\$PSQL -d ${TARGET_DB} -c "INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext)
  SELECT 4326, 'EPSG', 4326,
    '+proj=longlat +datum=WGS84 +no_defs',
    'GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563,AUTHORITY[\"EPSG\",\"7030\"]],AUTHORITY[\"EPSG\",\"6326\"]],PRIMEM[\"Greenwich\",0,AUTHORITY[\"EPSG\",\"8901\"]],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]],AUTHORITY[\"EPSG\",\"4326\"]]'
  WHERE NOT EXISTS (SELECT 1 FROM spatial_ref_sys WHERE srid = 4326)"

echo '--- verification ---'
\$PSQL -d ${TARGET_DB} -tAc "SELECT 'postgis='||extversion FROM pg_extension WHERE extname='postgis'"
\$PSQL -d ${TARGET_DB} -tAc "SELECT 'srid4326='||count(*) FROM spatial_ref_sys WHERE srid=4326"
\$PSQL -d ${TARGET_DB} -tAc "SELECT 'max_locks='||setting FROM pg_settings WHERE name='max_locks_per_transaction'"
\$PSQL -d ${TARGET_DB} -tAc "SELECT 'owner='||pg_get_userbyid(datdba) FROM pg_database WHERE datname='${TARGET_DB}'"
echo 'BOOTSTRAP-OK'
REMOTESCRIPT
)
REMOTE_B64="$(printf '%s' "$REMOTE" | base64 -w0)"
CMD_ID="$(aws ssm send-command --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript --comment 'swat db bootstrap' --timeout-seconds 600 \
  --parameters "commands=[\"echo $REMOTE_B64 | base64 -d > /tmp/swat-bootstrap.sh\",\"bash /tmp/swat-bootstrap.sh; rc=\$?; rm -f /tmp/swat-bootstrap.sh; exit \$rc\"]" \
  --query Command.CommandId --output text)"
echo "SSM command: $CMD_ID"

for _ in $(seq 1 60); do
  sleep 5
  ST="$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
    --query Status --output text 2>/dev/null || echo Pending)"
  case "$ST" in Success|Failed|Cancelled|TimedOut) break;; esac
done
echo "status: $ST"
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --query StandardOutputContent --output text | tail -20
ERR="$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --query StandardErrorContent --output text 2>/dev/null || true)"
[[ -n "$ERR" ]] && { echo "--- stderr ---"; echo "$ERR" | tail -20; }
[[ "$ST" == "Success" ]] || exit 1

RDS_HOST="$(aws ssm get-parameter --name "${SSM_PREFIX}/RDS_HOST" --query Parameter.Value --output text)"
cat <<NOTE

=== DATABASE_URL for infra/env/backend/.env.staging ===
Encrypt it in place (this keeps the existing dotenvx keypair, so nothing else in
the file needs re-encrypting and the SSM private key stays valid):

  cd revamp
  pnpm dlx @dotenvx/dotenvx set DATABASE_URL \\
    'postgresql://${APP_DB_ROLE}:<APP_DB_PASSWORD>@${RDS_HOST}:5432/${TARGET_DB}?schema=public&sslmode=require' \\
    -f infra/env/backend/.env.staging --encrypt

The password is in SSM (never printed here):
  aws ssm get-parameter --profile ${PROFILE} --region ${REGION} \\
    --name ${SSM_PREFIX}/APP_DB_PASSWORD --with-decryption --query Parameter.Value --output text
NOTE
