#!/usr/bin/env bash
# Create the SWAT staging CLI identity — the ONLY step that uses the root account.
#
#   aws login --profile dlhsby-swat-staging     # root browser session (interactive)
#   ./bootstrap-cli-user.sh
#
# After this, every other script runs as the IAM user and root is never used again.
# Root credentials cannot be scoped, rotated independently, or revoked without
# changing the account password, so they are wrong for day-to-day work — AWS's own
# guidance is to create an administrative user immediately and lock root away.
#
# Idempotent: re-running creates a fresh access key only if the user has none.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

# This script alone talks to AWS through the ROOT profile.
ROOT_PROFILE="${SWAT_ROOT_PROFILE:-dlhsby-swat-staging}"
root() { command aws --profile "$ROOT_PROFILE" --region "$REGION" "$@"; }

say "Root session check"
ARN="$(root sts get-caller-identity --query Arn --output text)"
ACCT="$(root sts get-caller-identity --query Account --output text)"
echo "$ARN (account $ACCT)"
[[ "$ACCT" == "$ACCOUNT_ID" ]] || {
  echo "ERROR: profile '$ROOT_PROFILE' is account $ACCT, expected $ACCOUNT_ID." >&2; exit 1; }

say "Opt-in region: $REGION"
# ap-southeast-3 (Jakarta) is an opt-in region — nothing can be created there until
# the account enables it, and enabling takes minutes to propagate.
STATUS="$(root account get-region-opt-status --region-name "$REGION" \
  --query RegionOptStatus --output text 2>/dev/null || echo UNKNOWN)"
echo "status: $STATUS"
case "$STATUS" in
  ENABLED|ENABLED_BY_DEFAULT) ;;
  ENABLING) echo "still enabling — re-run this script when it reports ENABLED." ;;
  *)
    root account enable-region --region-name "$REGION" >/dev/null
    echo "enable-region requested — this takes a few minutes."
    echo "Re-run this script once 'get-region-opt-status' reports ENABLED."
    ;;
esac

say "IAM user $CLI_USER_NAME"
if command aws --profile "$ROOT_PROFILE" iam get-user --user-name "$CLI_USER_NAME" >/dev/null 2>&1; then
  echo "exists: $CLI_USER_NAME"
else
  root iam create-user --user-name "$CLI_USER_NAME" \
    --tags "Key=Project,Value=swat-staging" >/dev/null
  echo "created: $CLI_USER_NAME"
fi
root iam attach-user-policy --user-name "$CLI_USER_NAME" \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess >/dev/null
echo "attached: AdministratorAccess"

say "Access key"
EXISTING="$(root iam list-access-keys --user-name "$CLI_USER_NAME" \
  --query 'AccessKeyMetadata[].AccessKeyId' --output text)"
if [[ -n "$EXISTING" && "$EXISTING" != "None" ]]; then
  cat <<NOTE
$CLI_USER_NAME already has access key(s): $EXISTING

A secret access key is shown exactly once, at creation, so an existing key cannot be
re-read. If you still hold it, configure the profile with it. If not, delete the old
key and re-run this script:
  aws --profile $ROOT_PROFILE iam delete-access-key --user-name $CLI_USER_NAME --access-key-id <id>
NOTE
  exit 0
fi

read -r KEY_ID SECRET <<<"$(root iam create-access-key --user-name "$CLI_USER_NAME" \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text)"

# Write the profile directly rather than printing the secret — a secret echoed to a
# terminal ends up in scrollback, and in this project's case, in a session transcript.
command aws configure set aws_access_key_id "$KEY_ID" --profile "$CLI_USER_NAME"
command aws configure set aws_secret_access_key "$SECRET" --profile "$CLI_USER_NAME"
command aws configure set region "$REGION" --profile "$CLI_USER_NAME"
command aws configure set output json --profile "$CLI_USER_NAME"
unset SECRET

say "Verify"
command aws --profile "$CLI_USER_NAME" sts get-caller-identity --query Arn --output text

cat <<NOTE

Profile '$CLI_USER_NAME' is configured (key $KEY_ID, region $REGION).

Root is done — do not use it again. Recommended follow-ups in the console:
  - enable MFA on the root user
  - confirm root has no access keys of its own

Next:  ./provision-staging.sh
NOTE
