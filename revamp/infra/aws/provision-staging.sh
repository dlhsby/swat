#!/usr/bin/env bash
# One-time AWS provisioning for SWAT staging — orchestrator.
#
# SWAT owns its whole account (732343865225, ap-southeast-3) as of the 2026-09
# migration off the shared co-tenant box. This runs the three provisioners in
# dependency order; each is idempotent and can also be run on its own for a
# partial re-run.
#
#   ./provision-staging.sh
#
# Requires the `dlhsby-swat-staging-cli` profile (IAM user of the same name). All
# account-scoped values live in staging.config.sh — override from the environment.
#
# NOT created here (deliberate): DNS records (registrar-managed, printed at the
# end), the GitHub repo Variables/secret, and the database itself (bootstrap-db.sh,
# which needs the box to exist first).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

echo "SWAT staging provisioning"
echo "  account : $ACCOUNT_ID"
echo "  region  : $REGION"
echo "  az      : $AZ  (EC2 and RDS both — cross-AZ traffic is billed)"
echo "  profile : $PROFILE"
echo "  ec2     : $INSTANCE_TYPE"
echo

bash "$HERE/provision-registry-iam.sh"
bash "$HERE/provision-network-compute.sh"
bash "$HERE/provision-data.sh"

INSTANCE_ID="$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)"
EIP="$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=$INSTANCE_NAME" \
  --query 'Addresses[0].PublicIp' --output text)"

cat <<NOTE

=========================================================================
Provisioning complete. Remaining steps, in order:

1. Bootstrap the database (app role + PostGIS + SRID 4326):
     ./bootstrap-db.sh

2. Point DNS at $EIP (registrar / Cloudflare panel), DNS-only if proxied:
     swat.wahyutrip.com  api.swat.wahyutrip.com  docs.swat.wahyutrip.com
   Caddy cannot issue certs until these resolve, so do this BEFORE deploying.

3. Re-encrypt the account-scoped values in infra/env/backend/.env.staging
   (DATABASE_URL, S3_BUCKET, S3_REPORTS_BUCKET) — bootstrap-db.sh prints the
   exact DATABASE_URL command. Keep the existing dotenvx keypair.

4. Push the backend dotenvx private key to SSM:
     aws ssm put-parameter --profile $PROFILE --region $REGION --type SecureString \\
       --name ${SSM_PREFIX}/BE_DOTENV_PRIVATE_KEY --overwrite \\
       --value "\$(grep DOTENV_PRIVATE_KEY_STAGING infra/env/backend/.env.keys | cut -d= -f2- | tr -d '\"')"

5. Set the GitHub repo Variables (Settings -> Secrets and variables -> Actions):
     AWS_REGION       $REGION
     AWS_ROLE_ARN     arn:aws:iam::${ACCOUNT_ID}:role/${GHA_ROLE_NAME}
     ECR_REGISTRY     $ECR_REGISTRY
     ECR_BACKEND      ${ECR_REGISTRY}/swat-backend
     ECR_WEB          ${ECR_REGISTRY}/swat-web
     ECR_DOCS         ${ECR_REGISTRY}/swat-docs
     EC2_INSTANCE_ID  $INSTANCE_ID
     RDS_INSTANCE_ID  $RDS_ID
   The staging Environment secret WEB_DOTENV_PRIVATE_KEY is UNCHANGED (same web
   dotenvx keypair) — only re-add it if the Environment itself was lost.

6. Confirm the SNS email subscription ($ALERT_EMAIL) or the alarms notify nobody.

7. Deploy: merge main -> staging (or run the workflow manually).

8. Seed the data (from a full local checkout with Docker):
     cd revamp && bash infra/reseed-via-ssm.sh --since-year=2026
=========================================================================
NOTE
