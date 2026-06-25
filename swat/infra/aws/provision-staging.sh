#!/usr/bin/env bash
# One-time AWS provisioning for SWAT staging (co-tenant on the shared dlhsby host).
# Idempotent: safe to re-run. Creates only SWAT-specific resources; reuses the
# shared EC2 / RDS / Caddy that sekar already runs.
#
#   ./provision-staging.sh
#
# Requires the `sekar` CLI profile (IAM user sekar-cli-admin, account 659828096624).
# Read AWS_* below before running. Nothing here is destructive; the RDS instance
# rename + the `swat_staging` database creation are printed as MANUAL steps (touch the
# shared instance and need coordination with sekar).
set -euo pipefail

PROFILE="${AWS_PROFILE:-sekar}"
REGION="${AWS_REGION:-ap-southeast-3}"
ACCOUNT_ID="659828096624"
EC2_INSTANCE_ID="i-08edccdc966c0985e"
GITHUB_REPO="dlhsby/swat"
PHOTOS_BUCKET="swat-photos-staging"
REPORTS_BUCKET="swat-reports-staging"
ROLE_NAME="swat-gha-deploy"

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }
say() { printf '\n=== %s ===\n' "$1"; }

say "Identity check"
aws sts get-caller-identity --query Arn --output text

say "ECR repositories (swat-backend, swat-web)"
for repo in swat-backend swat-web; do
  aws ecr describe-repositories --repository-names "$repo" >/dev/null 2>&1 \
    && echo "exists: $repo" \
    || { aws ecr create-repository --repository-name "$repo" \
           --image-scanning-configuration scanOnPush=true >/dev/null; echo "created: $repo"; }
done

say "S3 buckets (instance-role access; block public access)"
for bucket in "$PHOTOS_BUCKET" "$REPORTS_BUCKET"; do
  if aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
    echo "exists: $bucket"
  else
    aws s3api create-bucket --bucket "$bucket" \
      --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
    aws s3api put-public-access-block --bucket "$bucket" --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null
    echo "created: $bucket"
  fi
done

say "Reports bucket 7-day lifecycle expiry"
aws s3api put-bucket-lifecycle-configuration --bucket "$REPORTS_BUCKET" \
  --lifecycle-configuration '{"Rules":[{"ID":"expire-7d","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":7}}]}' >/dev/null
echo "lifecycle set on $REPORTS_BUCKET"

say "Grant the EC2 instance role S3 access to the SWAT buckets"
PROFILE_ARN=$(aws ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text)
INSTANCE_PROFILE_NAME="${PROFILE_ARN##*/}"
INSTANCE_ROLE=$(aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" \
  --query 'InstanceProfile.Roles[0].RoleName' --output text)
echo "instance role: $INSTANCE_ROLE"
aws iam put-role-policy --role-name "$INSTANCE_ROLE" --policy-name swat-staging-s3 --policy-document "$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],
   "Resource":["arn:aws:s3:::${PHOTOS_BUCKET}/*","arn:aws:s3:::${REPORTS_BUCKET}/*"]},
  {"Effect":"Allow","Action":["s3:ListBucket"],
   "Resource":["arn:aws:s3:::${PHOTOS_BUCKET}","arn:aws:s3:::${REPORTS_BUCKET}"]}
]}
JSON
)" >/dev/null
echo "attached inline policy swat-staging-s3"

say "SSM parameter placeholder for the dotenvx private key"
if aws ssm get-parameter --name /swat/staging/BE_DOTENV_PRIVATE_KEY >/dev/null 2>&1; then
  echo "exists: /swat/staging/BE_DOTENV_PRIVATE_KEY (leave as-is or rotate manually)"
else
  echo "MANUAL: after \`dotenvx encrypt\`, push the backend key:"
  echo "  aws ssm put-parameter --profile $PROFILE --region $REGION --type SecureString \\"
  echo "    --name /swat/staging/BE_DOTENV_PRIVATE_KEY \\"
  echo "    --value \"\$(grep DOTENV_PRIVATE_KEY_STAGING infra/env/backend/.env.keys | cut -d= -f2- | tr -d '\"')\""
fi

say "GitHub Actions OIDC deploy role ($ROLE_NAME)"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
# Trust is scoped to the staging branch + the staging Environment only (NOT `repo:…:*`):
# the deploy runs on push to `staging` (sub=ref:refs/heads/staging) and its build-push job
# is environment-scoped (sub=environment:staging). With a PUBLIC repo this blocks fork/PR
# refs from ever assuming the role.
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
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST" >/dev/null
  echo "updated trust: $ROLE_NAME"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
  echo "created: $ROLE_NAME (ensure the GitHub OIDC provider exists — sekar already created it)"
fi
# Least privilege: ECR push only to the two swat repos; SendCommand only to the box +
# the AWS-RunShellScript doc; snapshots only on the dlhsby instance with the predeploy
# name prefix. GetAuthorizationToken / GetCommandInvocation are account-level virtual
# actions and stay on "*".
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name swat-gha-deploy --policy-document "$(cat <<JSON
{"Version":"2012-10-17","Statement":[
  {"Sid":"EcrAuth","Effect":"Allow","Action":"ecr:GetAuthorizationToken","Resource":"*"},
  {"Sid":"EcrPush","Effect":"Allow",
   "Action":["ecr:BatchCheckLayerAvailability","ecr:InitiateLayerUpload","ecr:UploadLayerPart",
     "ecr:CompleteLayerUpload","ecr:PutImage","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"],
   "Resource":["arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/swat-backend",
     "arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/swat-web"]},
  {"Sid":"SsmSendToInstance","Effect":"Allow","Action":"ssm:SendCommand",
   "Resource":["arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/${EC2_INSTANCE_ID}",
     "arn:aws:ssm:${REGION}::document/AWS-RunShellScript"]},
  {"Sid":"SsmReadInvocation","Effect":"Allow","Action":["ssm:GetCommandInvocation","ssm:ListCommandInvocations"],"Resource":"*"},
  {"Sid":"RdsSnapshot","Effect":"Allow","Action":"rds:CreateDBSnapshot",
   "Resource":["arn:aws:rds:${REGION}:${ACCOUNT_ID}:db:dlhsby",
     "arn:aws:rds:${REGION}:${ACCOUNT_ID}:snapshot:swat-staging-predeploy-*"]}
]}
JSON
)" >/dev/null
echo "attached inline policy swat-gha-deploy"

cat <<NOTE

=== MANUAL follow-ups (shared-resource, coordinate with sekar) ===
1. RDS instance rename (if not already done): kobin-kpi-db -> dlhsby.
   sekar's config already targets host dlhsby.cvuoeguwo5dg.${REGION}.rds.amazonaws.com.
     aws --profile $PROFILE --region $REGION rds modify-db-instance \\
       --db-instance-identifier kobin-kpi-db --new-db-instance-identifier dlhsby --apply-immediately
2. Create the SWAT database + role on the shared `dlhsby` instance (psql as master):
     CREATE ROLE swat LOGIN PASSWORD '<strong>';
     CREATE DATABASE swat_staging OWNER swat;
   (Run from the box or anywhere that can reach the RDS endpoint on 5432.)
3. DNS A records in the wahyutrip.com zone (same zone as sekar.wahyutrip.com):
     swat.wahyutrip.com      A  16.79.124.63
     api.swat.wahyutrip.com  A  16.79.124.63
4. GitHub repo Variables + the staging Environment secret WEB_DOTENV_PRIVATE_KEY
   (see .github/workflows/deploy-staging.yml header).
NOTE
echo "Done."
