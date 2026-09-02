#!/usr/bin/env bash
# SWAT staging provisioning — part 1/3: cost guardrail, ECR, S3, IAM, OIDC.
#
# Idempotent; safe to re-run. Creates nothing that costs money except (indirectly)
# S3/ECR storage, both inside the free allowances. Run via ./provision-staging.sh,
# or standalone for a partial re-run.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

say "Identity"
CALLER_ARN="$(aws sts get-caller-identity --query Arn --output text)"
echo "$CALLER_ARN"
ACTUAL="$(aws sts get-caller-identity --query Account --output text)"
[[ "$ACTUAL" == "$ACCOUNT_ID" ]] || {
  echo "ERROR: profile '$PROFILE' is account $ACTUAL, expected $ACCOUNT_ID." >&2
  echo "       Refusing to provision into the wrong account." >&2; exit 1; }
# Root has no MFA-scoped blast radius and cannot be revoked without changing the
# account password — day-to-day work belongs to an IAM user. Root is used exactly
# once, by bootstrap-cli-user.sh, to create that user.
case "$CALLER_ARN" in
  *:root) echo "ERROR: this is the ROOT account. Run ./bootstrap-cli-user.sh once to create" >&2
          echo "       the ${CLI_USER_NAME} IAM user, then re-run with that profile." >&2; exit 1 ;;
esac

# ---------------------------------------------------------------------------
say "Cost guardrail: budget + alert topic (created BEFORE any billable resource)"
TOPIC_ARN="$(aws sns create-topic --name "$SNS_TOPIC_NAME" --query TopicArn --output text)"
if ! aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" \
      --query 'Subscriptions[].Endpoint' --output text | tr '\t' '\n' | grep -qx "$ALERT_EMAIL"; then
  aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "$ALERT_EMAIL" >/dev/null
  echo "subscribed $ALERT_EMAIL to $SNS_TOPIC_NAME — CONFIRM THE EMAIL or alarms go nowhere"
fi

# Budgets is a global (us-east-1) service and takes no --region.
if command aws --profile "$PROFILE" budgets describe-budget --account-id "$ACCOUNT_ID" \
     --budget-name swat-staging-zero-spend >/dev/null 2>&1; then
  echo "exists: budget swat-staging-zero-spend"
else
  command aws --profile "$PROFILE" budgets create-budget --account-id "$ACCOUNT_ID" \
    --budget "{\"BudgetName\":\"swat-staging-zero-spend\",\"BudgetType\":\"COST\",\"TimeUnit\":\"MONTHLY\",
               \"BudgetLimit\":{\"Amount\":\"${BUDGET_LIMIT_USD}\",\"Unit\":\"USD\"}}" \
    --notifications-with-subscribers "[
      {\"Notification\":{\"NotificationType\":\"ACTUAL\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":1,\"ThresholdType\":\"PERCENTAGE\"},
       \"Subscribers\":[{\"SubscriptionType\":\"EMAIL\",\"Address\":\"${ALERT_EMAIL}\"}]},
      {\"Notification\":{\"NotificationType\":\"FORECASTED\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":100,\"ThresholdType\":\"PERCENTAGE\"},
       \"Subscribers\":[{\"SubscriptionType\":\"EMAIL\",\"Address\":\"${ALERT_EMAIL}\"}]}]" >/dev/null
  echo "created: budget swat-staging-zero-spend (\$${BUDGET_LIMIT_USD}/mo, alerts at 1% actual + 100% forecast)"
fi

# ---------------------------------------------------------------------------
say "ECR repositories (${ECR_REPOS[*]})"
# Lifecycle keeps only the newest N images: the free ECR allowance is 500 MB and
# these are ~200 MB images, so an unbounded per-SHA history leaves it in a week.
LIFECYCLE="{\"rules\":[{\"rulePriority\":1,\"description\":\"keep last ${ECR_KEEP_IMAGES}\",
  \"selection\":{\"tagStatus\":\"any\",\"countType\":\"imageCountMoreThan\",\"countNumber\":${ECR_KEEP_IMAGES}},
  \"action\":{\"type\":\"expire\"}}]}"
for repo in "${ECR_REPOS[@]}"; do
  have aws ecr describe-repositories --repository-names "$repo" \
    && echo "exists: $repo" \
    || { aws ecr create-repository --repository-name "$repo" \
           --image-scanning-configuration scanOnPush=true >/dev/null; echo "created: $repo"; }
  aws ecr put-lifecycle-policy --repository-name "$repo" --lifecycle-policy-text "$LIFECYCLE" >/dev/null
done
echo "lifecycle: keep newest ${ECR_KEEP_IMAGES} images per repo"

# ---------------------------------------------------------------------------
say "S3 buckets (private; instance-role access only)"
for bucket in "$PHOTOS_BUCKET" "$REPORTS_BUCKET"; do
  if have aws s3api head-bucket --bucket "$bucket"; then
    echo "exists: $bucket"
  else
    aws s3api create-bucket --bucket "$bucket" \
      --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
    echo "created: $bucket"
  fi
  aws s3api put-public-access-block --bucket "$bucket" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null
  aws s3api put-bucket-encryption --bucket "$bucket" --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null
done

# Reports bucket does triple duty: generated exports (7d), reseed artifacts (7d),
# and the nightly pg_dump under backups/ (14d, kept longer as the recovery path).
aws s3api put-bucket-lifecycle-configuration --bucket "$REPORTS_BUCKET" \
  --lifecycle-configuration '{"Rules":[
    {"ID":"expire-exports-7d","Status":"Enabled","Filter":{"Prefix":"reports/"},"Expiration":{"Days":7}},
    {"ID":"expire-seed-7d","Status":"Enabled","Filter":{"Prefix":"seed/"},"Expiration":{"Days":7}},
    {"ID":"expire-backups-14d","Status":"Enabled","Filter":{"Prefix":"backups/"},"Expiration":{"Days":14}}]}' >/dev/null
echo "lifecycle set on $REPORTS_BUCKET (reports/seed 7d, backups 14d)"

# ---------------------------------------------------------------------------
say "EC2 instance role ($EC2_ROLE_NAME)"
EC2_TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
if have aws iam get-role --role-name "$EC2_ROLE_NAME"; then
  echo "exists: $EC2_ROLE_NAME"
else
  aws iam create-role --role-name "$EC2_ROLE_NAME" --assume-role-policy-document "$EC2_TRUST" >/dev/null
  echo "created: $EC2_ROLE_NAME"
fi
# Session Manager + Run Command: the ONLY access path to the box (no SSH key exists).
aws iam attach-role-policy --role-name "$EC2_ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore >/dev/null

aws iam put-role-policy --role-name "$EC2_ROLE_NAME" --policy-name swat-staging-s3 \
  --policy-document "$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],
   "Resource":["arn:aws:s3:::${PHOTOS_BUCKET}/*","arn:aws:s3:::${REPORTS_BUCKET}/*"]},
  {"Effect":"Allow","Action":["s3:ListBucket"],
   "Resource":["arn:aws:s3:::${PHOTOS_BUCKET}","arn:aws:s3:::${REPORTS_BUCKET}"]}
]}
JSON
)" >/dev/null

# Read-only on SWAT's own parameters: the dotenvx key at boot, the RDS master creds
# for the nightly backup + the tunnel-free reseed.
aws iam put-role-policy --role-name "$EC2_ROLE_NAME" --policy-name swat-staging-ssm-read \
  --policy-document "$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":["ssm:GetParameter","ssm:GetParameters","ssm:GetParametersByPath"],
   "Resource":"arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter${SSM_PREFIX}/*"},
  {"Effect":"Allow","Action":["kms:Decrypt"],"Resource":"*",
   "Condition":{"StringEquals":{"kms:ViaService":"ssm.${REGION}.amazonaws.com"}}},
  {"Sid":"DenyParametersOutsideOurNamespace","Effect":"Deny",
   "Action":["ssm:GetParameter","ssm:GetParameters","ssm:GetParametersByPath"],
   "NotResource":["arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter${SSM_PREFIX}/*",
     "arn:aws:ssm:${REGION}::parameter/aws/service/*"]}
]}
JSON
)" >/dev/null
# The Deny above is load-bearing. AmazonSSMManagedInstanceCore (AWS-managed, and
# required for Session Manager / Run Command) grants ssm:GetParameter on "*", so
# the Allow alone does NOT scope the box to its own namespace — verified with
# iam simulate-principal-policy, which returned "allowed" for an unrelated
# parameter until this statement was added. An explicit Deny always wins.
# /aws/service/* stays readable: those are AWS's public parameters (AMI ids etc).
echo "attached: swat-staging-s3, swat-staging-ssm-read, AmazonSSMManagedInstanceCore"

if have aws iam get-instance-profile --instance-profile-name "$EC2_ROLE_NAME"; then
  echo "exists: instance profile $EC2_ROLE_NAME"
else
  aws iam create-instance-profile --instance-profile-name "$EC2_ROLE_NAME" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$EC2_ROLE_NAME" \
    --role-name "$EC2_ROLE_NAME" >/dev/null
  echo "created: instance profile $EC2_ROLE_NAME"
fi

# ---------------------------------------------------------------------------
say "GitHub Actions OIDC provider"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if have aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN"; then
  echo "exists: OIDC provider"
else
  # No --thumbprint-list: IAM verifies GitHub's certificate chain itself for this
  # well-known provider, so a pinned thumbprint is one more thing to rotate.
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com >/dev/null
  echo "created: OIDC provider"
fi

say "GitHub Actions deploy role ($GHA_ROLE_NAME)"
# Trust is scoped to the staging branch + the staging Environment only (NOT
# `repo:…:*`): the deploy runs on push to `staging` (sub=ref:refs/heads/staging) and
# its build-push job is environment-scoped (sub=environment:staging). The repo is
# PUBLIC, so this is what stops a fork/PR ref from ever assuming the role.
TRUST=$(cat <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
 "Principal":{"Federated":"${OIDC_ARN}"},
 "Action":"sts:AssumeRoleWithWebIdentity",
 "Condition":{"StringEquals":{"token.actions.githubusercontent.com:aud":"sts.amazonaws.com"},
   "StringLike":{"token.actions.githubusercontent.com:sub":[
     "repo:${GITHUB_REPO}:ref:refs/heads/staging",
     "repo:${GITHUB_REPO}:environment:staging"]}}}]}
JSON
)
if have aws iam get-role --role-name "$GHA_ROLE_NAME"; then
  aws iam update-assume-role-policy --role-name "$GHA_ROLE_NAME" --policy-document "$TRUST" >/dev/null
  echo "updated trust: $GHA_ROLE_NAME"
else
  aws iam create-role --role-name "$GHA_ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
  echo "created: $GHA_ROLE_NAME"
fi

# Least privilege. Note EcrPush covers ALL THREE repos — the old policy omitted
# swat-docs and the docs push 403'd. SsmSendToInstance is resolved to the actual
# instance by provision-staging.sh once the box exists (see the re-run note there);
# until then it is scoped to instances tagged for this stack.
aws iam put-role-policy --role-name "$GHA_ROLE_NAME" --policy-name "$GHA_ROLE_NAME" \
  --policy-document "$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"EcrAuth","Effect":"Allow","Action":"ecr:GetAuthorizationToken","Resource":"*"},
  {"Sid":"EcrPush","Effect":"Allow",
   "Action":["ecr:BatchCheckLayerAvailability","ecr:InitiateLayerUpload","ecr:UploadLayerPart",
     "ecr:CompleteLayerUpload","ecr:PutImage","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"],
   "Resource":["arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/swat-backend",
     "arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/swat-web",
     "arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/swat-docs"]},
  {"Sid":"SsmSendToInstance","Effect":"Allow","Action":"ssm:SendCommand",
   "Resource":["arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/*",
     "arn:aws:ssm:${REGION}::document/AWS-RunShellScript"],
   "Condition":{"StringEquals":{"ssm:resourceTag/Project":"swat-staging"}}},
  {"Sid":"SsmSendToDocument","Effect":"Allow","Action":"ssm:SendCommand",
   "Resource":"arn:aws:ssm:${REGION}::document/AWS-RunShellScript"},
  {"Sid":"SsmReadInvocation","Effect":"Allow",
   "Action":["ssm:GetCommandInvocation","ssm:ListCommandInvocations"],"Resource":"*"},
  {"Sid":"RdsSnapshot","Effect":"Allow",
   "Action":["rds:CreateDBSnapshot","rds:DeleteDBSnapshot"],
   "Resource":["arn:aws:rds:${REGION}:${ACCOUNT_ID}:db:${RDS_ID}",
     "arn:aws:rds:${REGION}:${ACCOUNT_ID}:snapshot:swat-staging-predeploy-*"]},
  {"Sid":"RdsListSnapshots","Effect":"Allow","Action":"rds:DescribeDBSnapshots","Resource":"*"}
]}
JSON
)" >/dev/null
echo "attached inline policy $GHA_ROLE_NAME (ECR push x3, SSM send, RDS snapshot create+prune)"

say "Part 1 done"
echo "ECR registry: $ECR_REGISTRY"
