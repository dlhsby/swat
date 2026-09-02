#!/usr/bin/env bash
# Office-hours start/stop schedule for the SWAT staging stack.
#
# Staging is only useful while someone is testing it, so it runs 09:00-17:00 WIB
# and is stopped the rest of the time. That removes ~67% of the compute bill:
# EC2 $19.27 -> $6.42 and RDS $18.25 -> $6.08 per month at Jakarta on-demand rates.
#
#   ./provision-schedule.sh            # install / update the schedules
#   ./provision-schedule.sh --disable  # pause them (stack then runs 24/7)
#   ./provision-schedule.sh --enable   # resume
#
# Uses EventBridge Scheduler *universal targets*, which call the EC2/RDS APIs
# directly — no Lambda to maintain and nothing to pay for (the free tier covers
# 14M invocations; this uses ~120/month).
#
# What still bills while stopped: the Elastic IP, the EBS root volume and the RDS
# storage. Only the instance-hours stop. That floor is ~$9.30/month.
#
# Caveats worth knowing:
#   - The site is DOWN outside the window. That is the point, but say so to UAT users.
#   - A stopped RDS instance is auto-started by AWS after 7 days. The daily stop
#     here keeps resetting that clock, so it never triggers — but if you --disable
#     the schedule while the DB is stopped, AWS will start it again within a week.
#   - Containers come back by themselves: every service is `restart: unless-stopped`
#     and docker is systemd-enabled, so a boot restores the stack with no deploy.
#   - RDS is started 15 min before EC2 and stopped 10 min after it, so the backend
#     never comes up against a database that is not ready.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

TZ_NAME="${SWAT_SCHEDULE_TZ:-Asia/Jakarta}"
START_HOUR="${SWAT_START_HOUR:-9}"     # EC2 up at 09:00 local
STOP_HOUR="${SWAT_STOP_HOUR:-17}"      # EC2 down at 17:00 local
ROLE_NAME="swat-scheduler"
GROUP="default"

ACTION="${1:-install}"

INSTANCE_ID="$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running,stopped,stopping,pending" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)"
[[ "$INSTANCE_ID" != "None" && -n "$INSTANCE_ID" ]] || { echo "ERROR: no $INSTANCE_NAME instance found." >&2; exit 1; }

case "$ACTION" in
  --disable|--enable)
    STATE=$([[ "$ACTION" == "--enable" ]] && echo ENABLED || echo DISABLED)
    for n in swat-rds-start swat-ec2-start swat-ec2-stop swat-rds-stop; do
      aws scheduler update-schedule --name "$n" --group-name "$GROUP" --state "$STATE" \
        --schedule-expression "$(aws scheduler get-schedule --name "$n" --group-name "$GROUP" --query ScheduleExpression --output text)" \
        --schedule-expression-timezone "$TZ_NAME" \
        --flexible-time-window '{"Mode":"OFF"}' \
        --target "$(aws scheduler get-schedule --name "$n" --group-name "$GROUP" --query Target --output json)" >/dev/null
      echo "$STATE: $n"
    done
    exit 0 ;;
esac

say "IAM role for EventBridge Scheduler ($ROLE_NAME)"
TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Service":"scheduler.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
if have aws iam get-role --role-name "$ROLE_NAME"; then
  echo "exists: $ROLE_NAME"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
  echo "created: $ROLE_NAME"
fi
# Scoped to exactly this instance and this database — the schedule can start and
# stop these two resources and nothing else in the account.
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name swat-start-stop \
  --policy-document "$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"Ec2StartStop","Effect":"Allow","Action":["ec2:StartInstances","ec2:StopInstances"],
   "Resource":"arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}"},
  {"Sid":"RdsStartStop","Effect":"Allow","Action":["rds:StartDBInstance","rds:StopDBInstance"],
   "Resource":"arn:aws:rds:${REGION}:${ACCOUNT_ID}:db:${RDS_ID}"}
]}
JSON
)" >/dev/null
echo "attached: swat-start-stop (scoped to $INSTANCE_ID and $RDS_ID)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

# A freshly created IAM role is not immediately assumable by the scheduler service
# — CreateSchedule fails with "The execution role you provide must allow AWS
# EventBridge Scheduler to assume the role" for a few seconds. Retry rather than
# make the operator re-run the script.
retry() {
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 5
  done
  "$@"   # final attempt, surfacing the real error
}

sched() { # name, cron, target-arn, input
  local name="$1" cron="$2" arn="$3" input="$4"
  local target
  target=$(jq -nc --arg a "$arn" --arg r "$ROLE_ARN" --arg i "$input" \
    '{Arn:$a, RoleArn:$r, Input:$i, RetryPolicy:{MaximumRetryAttempts:3}}')
  if have aws scheduler get-schedule --name "$name" --group-name "$GROUP"; then
    aws scheduler update-schedule --name "$name" --group-name "$GROUP" \
      --schedule-expression "$cron" --schedule-expression-timezone "$TZ_NAME" \
      --flexible-time-window '{"Mode":"OFF"}' --target "$target" --state ENABLED >/dev/null
    echo "updated: $name  ($cron $TZ_NAME)"
  else
    retry aws scheduler create-schedule --name "$name" --group-name "$GROUP" \
      --schedule-expression "$cron" --schedule-expression-timezone "$TZ_NAME" \
      --flexible-time-window '{"Mode":"OFF"}' --target "$target" --state ENABLED
    echo "created: $name  ($cron $TZ_NAME)"
  fi
}

say "Schedules (${START_HOUR}:00-${STOP_HOUR}:00 $TZ_NAME, every day)"
# RDS first on the way up, last on the way down — the backend must never boot
# against a database that is still starting.
sched swat-rds-start "cron(45 $((START_HOUR-1)) * * ? *)" \
  "arn:aws:scheduler:::aws-sdk:rds:startDBInstance" "{\"DbInstanceIdentifier\":\"${RDS_ID}\"}"
sched swat-ec2-start "cron(0 ${START_HOUR} * * ? *)" \
  "arn:aws:scheduler:::aws-sdk:ec2:startInstances" "{\"InstanceIds\":[\"${INSTANCE_ID}\"]}"
sched swat-ec2-stop  "cron(0 ${STOP_HOUR} * * ? *)" \
  "arn:aws:scheduler:::aws-sdk:ec2:stopInstances" "{\"InstanceIds\":[\"${INSTANCE_ID}\"]}"
sched swat-rds-stop  "cron(10 ${STOP_HOUR} * * ? *)" \
  "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance" "{\"DbInstanceIdentifier\":\"${RDS_ID}\"}"

cat <<NOTE

Staging now runs ${START_HOUR}:00-${STOP_HOUR}:00 $TZ_NAME daily and is stopped otherwise.
  RDS starts 15 min early and stops 10 min late, so the app never races the database.
  Outside the window the site is DOWN — that is intended.
  Storage keeps billing while stopped (EIP + EBS + RDS storage, ~\$9.30/month floor).
  Pause with: ./provision-schedule.sh --disable
NOTE
