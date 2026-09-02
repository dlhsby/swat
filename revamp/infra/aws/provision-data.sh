#!/usr/bin/env bash
# SWAT staging provisioning — part 3/3: RDS, SSM parameters, CloudWatch alarms.
#
# Idempotent. Depends on parts 1 and 2 (instance role, security groups, the box).
#
# The parameter group is NOT optional cosmetics: migration
# 20260608000100_partition_transactions creates ~676 monthly child partitions in a
# single transaction, which needs far more lock slots than Postgres' default 64.
# Without max_locks_per_transaction=2048 the very first `prisma migrate deploy`
# fails with "out of shared memory / max_locks_per_transaction".
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
DB_SG="$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" \
  "Name=group-name,Values=$DB_SG_NAME" --query 'SecurityGroups[0].GroupId' --output text)"
[[ "$DB_SG" != "None" && -n "$DB_SG" ]] || { echo "ERROR: $DB_SG_NAME missing — run provision-network-compute.sh first." >&2; exit 1; }

say "RDS parameter group ($RDS_PARAM_GROUP)"
if have aws rds describe-db-parameter-groups --db-parameter-group-name "$RDS_PARAM_GROUP"; then
  echo "exists: $RDS_PARAM_GROUP"
else
  aws rds create-db-parameter-group --db-parameter-group-name "$RDS_PARAM_GROUP" \
    --db-parameter-group-family postgres15 \
    --description 'SWAT staging: lock slots for the partitioned transaction tables' >/dev/null
  echo "created: $RDS_PARAM_GROUP"
fi
# static => needs a reboot to apply; the instance below is created WITH the group,
# so a fresh instance already boots with it.
aws rds modify-db-parameter-group --db-parameter-group-name "$RDS_PARAM_GROUP" \
  --parameters 'ParameterName=max_locks_per_transaction,ParameterValue=2048,ApplyMethod=pending-reboot' >/dev/null
echo "set: max_locks_per_transaction=2048"

# ---------------------------------------------------------------------------
say "DB subnet group"
# RDS REQUIRES a subnet group spanning >=2 AZs even for a single-AZ instance; the
# instance itself is still pinned to $AZ below, which is what makes traffic free.
SUBNETS="$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
  --query 'Subnets[].SubnetId' --output text)"
if have aws rds describe-db-subnet-groups --db-subnet-group-name swat-staging-subnets; then
  echo "exists: swat-staging-subnets"
else
  # shellcheck disable=SC2086
  aws rds create-db-subnet-group --db-subnet-group-name swat-staging-subnets \
    --db-subnet-group-description 'SWAT staging' --subnet-ids $SUBNETS >/dev/null
  echo "created: swat-staging-subnets"
fi

# ---------------------------------------------------------------------------
say "RDS instance ($RDS_ID, $RDS_CLASS, $AZ)"
if have aws rds describe-db-instances --db-instance-identifier "$RDS_ID"; then
  echo "exists: $RDS_ID"
else
  # Password is generated here and immediately stored in SSM — it is never echoed
  # and never written to disk.
  MASTER_PW="$(aws secretsmanager get-random-password --exclude-punctuation \
    --password-length 32 --query RandomPassword --output text 2>/dev/null \
    || LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)"
  aws ssm put-parameter --name "${SSM_PREFIX}/RDS_MASTER_USERNAME" --type String \
    --value "$RDS_MASTER_USER" --overwrite >/dev/null
  aws ssm put-parameter --name "${SSM_PREFIX}/RDS_MASTER_PASSWORD" --type SecureString \
    --value "$MASTER_PW" --overwrite >/dev/null

  aws rds create-db-instance \
    --db-instance-identifier "$RDS_ID" \
    --db-instance-class "$RDS_CLASS" \
    --engine postgres --engine-version "$RDS_ENGINE_VERSION" \
    --allocated-storage "$RDS_STORAGE_GB" --storage-type gp3 --storage-encrypted \
    --master-username "$RDS_MASTER_USER" --master-user-password "$MASTER_PW" \
    --db-subnet-group-name swat-staging-subnets \
    --vpc-security-group-ids "$DB_SG" \
    --db-parameter-group-name "$RDS_PARAM_GROUP" \
    --availability-zone "$AZ" --no-multi-az \
    --no-publicly-accessible \
    --backup-retention-period 1 \
    --no-enable-performance-insights \
    --monitoring-interval 0 \
    --no-auto-minor-version-upgrade \
    --tags "Key=Name,Value=$RDS_ID" "Key=Project,Value=swat-staging" >/dev/null
  echo "created: $RDS_ID — waiting for available (this takes several minutes)…"
  aws rds wait db-instance-available --db-instance-identifier "$RDS_ID"
fi

RDS_HOST="$(aws rds describe-db-instances --db-instance-identifier "$RDS_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)"
RDS_AZ="$(aws rds describe-db-instances --db-instance-identifier "$RDS_ID" \
  --query 'DBInstances[0].AvailabilityZone' --output text)"
echo "endpoint: $RDS_HOST (az $RDS_AZ)"
[[ "$RDS_AZ" == "$AZ" ]] || echo "WARNING: RDS is in $RDS_AZ but the box is in $AZ — cross-AZ transfer is BILLED." >&2

# Parameters the box's nightly backup script reads.
aws ssm put-parameter --name "${SSM_PREFIX}/RDS_HOST" --type String --value "$RDS_HOST" --overwrite >/dev/null
aws ssm put-parameter --name "${SSM_PREFIX}/BACKUP_BUCKET" --type String --value "$REPORTS_BUCKET" --overwrite >/dev/null
echo "ssm: ${SSM_PREFIX}/{RDS_HOST,BACKUP_BUCKET,RDS_MASTER_USERNAME,RDS_MASTER_PASSWORD}"

# ---------------------------------------------------------------------------
say "CloudWatch alarms"
# Both failure modes are invisible to a plain health check:
#  - storage exhaustion: at 0 bytes free Postgres cannot even TRUNCATE (it needs
#    WAL space to record it), and RDS storage can never be shrunk afterwards.
#  - memory pressure: Postgres keeps serving EXISTING pooled connections while
#    refusing NEW ones, so the API returns 200 while nobody can log in.
TOPIC_ARN="$(aws sns create-topic --name "$SNS_TOPIC_NAME" --query TopicArn --output text)"
aws cloudwatch put-metric-alarm --alarm-name swat-staging-rds-low-storage \
  --alarm-description 'SWAT staging RDS free storage below 2 GB' \
  --namespace AWS/RDS --metric-name FreeStorageSpace --statistic Average \
  --dimensions "Name=DBInstanceIdentifier,Value=$RDS_ID" \
  --period 300 --evaluation-periods 2 --threshold 2147483648 \
  --comparison-operator LessThanThreshold --treat-missing-data missing \
  --alarm-actions "$TOPIC_ARN" >/dev/null
aws cloudwatch put-metric-alarm --alarm-name swat-staging-rds-low-memory \
  --alarm-description 'SWAT staging RDS freeable memory below 100 MB' \
  --namespace AWS/RDS --metric-name FreeableMemory --statistic Average \
  --dimensions "Name=DBInstanceIdentifier,Value=$RDS_ID" \
  --period 300 --evaluation-periods 2 --threshold 104857600 \
  --comparison-operator LessThanThreshold --treat-missing-data missing \
  --alarm-actions "$TOPIC_ARN" >/dev/null
echo "alarms: swat-staging-rds-low-storage, swat-staging-rds-low-memory"

say "Part 3 done — remaining MANUAL step: bootstrap the database"
cat <<NOTE
Run bootstrap-db.sh next. It creates the app role + database and enables PostGIS
as the RDS master, over SSM (RDS is private — there is nothing to tunnel):

  ./bootstrap-db.sh

RDS endpoint : $RDS_HOST
Database     : $TARGET_DB
App role     : $APP_DB_ROLE
NOTE
