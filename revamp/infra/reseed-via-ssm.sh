#!/usr/bin/env bash
#
# Tunnel-free staging reseed. Builds the PostgreSQL seed artifact LOCALLY (the heavy
# MySQL→Postgres ETL, where your laptop has the RAM the t3.micro box doesn't), ships it
# to the box via S3, and restores it into the PRIVATE RDS *on the box* via SSM Run
# Command — so the bulk COPY is a fast in-VPC load and NO port-forward tunnel is needed.
#
# Why this exists: the SSM port-forward tunnel is fragile (dies on IPv6/NAT64 networks),
# and the shared t3.micro box is too small to stand up the ETL's ephemeral MySQL. This
# splits the work: ETL local, restore in-VPC. `aws ssm send-command` is a plain API call
# that works over NAT64, unlike the port-forward.
#
# Prereqs (all already true for staging):
#   - aws cli authenticated for the `sekar` profile (the shared box's account)
#   - docker locally (build-seed-dump.sh stands up throwaway MySQL + Postgres)
#   - the box's instance role can: read the artifact S3 bucket, read the RDS master SSM
#     params (/sekar/staging/RDS_MASTER_*), and run docker
#
# Usage (from revamp/):
#   bash infra/reseed-via-ssm.sh                     # full history
#   bash infra/reseed-via-ssm.sh --since-year=2026   # 2026→ only (what staging runs)
#   bash infra/reseed-via-ssm.sh --since-year=2026 --keep-artifact
#
# Overridable via env: SEED_PROFILE, SEED_REGION, SEED_INSTANCE_ID, SEED_RDS_HOST,
#   SEED_TARGET_DB, SEED_S3_BUCKET, SEED_S3_PREFIX, SEED_MASTER_USER_PARAM,
#   SEED_MASTER_PW_PARAM, SEED_CMD_TIMEOUT.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROFILE="${SEED_PROFILE:-sekar}"
REGION="${SEED_REGION:-ap-southeast-3}"
INSTANCE_ID="${SEED_INSTANCE_ID:-i-08edccdc966c0985e}"
RDS_HOST="${SEED_RDS_HOST:-dlhsby.cvuoeguwo5dg.ap-southeast-3.rds.amazonaws.com}"
TARGET_DB="${SEED_TARGET_DB:-swat_staging}"
S3_BUCKET="${SEED_S3_BUCKET:-swat-reports-staging}"
S3_PREFIX="${SEED_S3_PREFIX:-seed}"
MASTER_USER_PARAM="${SEED_MASTER_USER_PARAM:-/sekar/staging/RDS_MASTER_USERNAME}"
MASTER_PW_PARAM="${SEED_MASTER_PW_PARAM:-/sekar/staging/RDS_MASTER_PASSWORD}"
CMD_TIMEOUT="${SEED_CMD_TIMEOUT:-3600}"

SINCE_ARG=""
KEEP_ARTIFACT=""
for arg in "$@"; do
  case "$arg" in
    --since-year=*) SINCE_ARG="$arg" ;;
    --keep-artifact) KEEP_ARTIFACT=1 ;;
    *) echo "Unknown argument: $arg (expected --since-year=YYYY, --keep-artifact)" >&2; exit 2 ;;
  esac
done

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

label="${SINCE_ARG#--since-year=}"; label="${label:-full}"
ARTIFACT="/tmp/swat-seed-${label}-$(date +%Y%m%d%H%M%S).sql.gz"
S3_KEY="$S3_PREFIX/$(basename "$ARTIFACT")"

echo "==> [1/4] Building seed artifact locally (ETL: throwaway MySQL+Postgres → pg_dump)…"
bash "$HERE/build-seed-dump.sh" ${SINCE_ARG} --out="$ARTIFACT"
echo "    artifact: $ARTIFACT ($(du -h "$ARTIFACT" | cut -f1))"

echo "==> [2/4] Uploading artifact to s3://$S3_BUCKET/$S3_KEY…"
aws s3 cp "$ARTIFACT" "s3://$S3_BUCKET/$S3_KEY"

echo "==> [3/4] Restoring on the box via SSM Run Command (RDS is local there — no tunnel)…"
# Ship restore-seed-dump.sh to the box (base64 → self-contained, independent of any box
# checkout). The box fetches the master creds + artifact itself; the password never
# appears in the command text or SSM history.
RESTORE_B64="$(base64 -w0 "$HERE/restore-seed-dump.sh")"
REMOTE_SCRIPT=$(cat <<REMOTE
set -euo pipefail
export AWS_DEFAULT_REGION=$REGION
MUSER=\$(aws ssm get-parameter --name "$MASTER_USER_PARAM" --query Parameter.Value --output text)
MPW=\$(aws ssm get-parameter --name "$MASTER_PW_PARAM" --with-decryption --query Parameter.Value --output text)
aws s3 cp "s3://$S3_BUCKET/$S3_KEY" /tmp/swat-seed.sql.gz
echo "$RESTORE_B64" | base64 -d > /tmp/restore-seed-dump.sh
# URL-encode nothing fancy: the master password lives only in this env var on the box.
URL="postgresql://\$MUSER:\$MPW@$RDS_HOST:5432/$TARGET_DB?sslmode=require"
bash /tmp/restore-seed-dump.sh /tmp/swat-seed.sql.gz "\$URL"
rm -f /tmp/swat-seed.sql.gz /tmp/restore-seed-dump.sh
REMOTE
)
REMOTE_B64="$(printf '%s' "$REMOTE_SCRIPT" | base64 -w0)"

CMD_ID="$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "tunnel-free reseed restore ($TARGET_DB, since=$label)" \
  --timeout-seconds "$CMD_TIMEOUT" \
  --parameters "commands=[\"echo $REMOTE_B64 | base64 -d > /tmp/reseed.sh\",\"bash /tmp/reseed.sh; rm -f /tmp/reseed.sh\"]" \
  --query 'Command.CommandId' --output text)"
echo "    SSM command: $CMD_ID"

echo "==> [4/4] Waiting for the restore to finish…"
while :; do
  sleep 20
  ST="$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --query 'Status' --output text 2>/dev/null || echo Pending)"
  echo "    status: $ST"
  case "$ST" in
    Success) break ;;
    Failed|Cancelled|TimedOut) echo "ERROR: restore $ST." >&2; break ;;
  esac
done

echo "==> ---- restore output (tail) ----"
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --query 'StandardOutputContent' --output text 2>/dev/null | tail -25
ERR="$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --query 'StandardErrorContent' --output text 2>/dev/null || true)"
[[ -n "$ERR" ]] && { echo "==> ---- stderr (tail) ----"; echo "$ERR" | tail -15; }

if [[ -z "$KEEP_ARTIFACT" ]]; then
  rm -f "$ARTIFACT"
  aws s3 rm "s3://$S3_BUCKET/$S3_KEY" >/dev/null 2>&1 || true
  echo "==> Cleaned up local + S3 artifact (--keep-artifact to retain)."
fi
echo "==> Done. Schema must already match the artifact's migrations (staging is kept current by deploys)."
echo "    If you changed migrations, deploy first so the target schema matches before reseeding."
