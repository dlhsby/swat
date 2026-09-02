#!/usr/bin/env bash
# Shared configuration for the SWAT staging provisioners.
#
# Sourced by provision-*.sh. Every account-scoped value lives HERE and nowhere
# else, so a future account move is one file, not a repo-wide grep. (The 2026-09
# migration off the shared account was slow precisely because ids were scattered.)
#
# Override any value from the environment: `REGION=ap-southeast-1 ./provision-staging.sh`.

PROFILE="${AWS_PROFILE:-dlhsby-swat-staging-cli}"
REGION="${AWS_REGION:-ap-southeast-3}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-732343865225}"

# Single AZ for EC2 *and* RDS. Cross-AZ traffic is billed both directions and the
# backend hits the DB on every request, so a mismatch is a permanent silent charge.
AZ="${SWAT_AZ:-${REGION}a}"

# EC2. t3.small under the credit-based free plan; set SWAT_INSTANCE_TYPE=t3.micro
# if the account is on the classic 12-month free tier (t3.small is NOT in it).
INSTANCE_TYPE="${SWAT_INSTANCE_TYPE:-t3.small}"
INSTANCE_NAME="swat-staging"
ROOT_VOLUME_GB="${SWAT_ROOT_VOLUME_GB:-30}"   # 30 GB is the free-tier EBS cap

# RDS. db.t4g.micro single-AZ, 20 GB — the free-tier shape. RDS storage can NEVER
# be shrunk, so do not raise this "just in case".
RDS_ID="${SWAT_RDS_ID:-swat-staging}"
RDS_CLASS="${SWAT_RDS_CLASS:-db.t4g.micro}"
RDS_STORAGE_GB="${SWAT_RDS_STORAGE_GB:-20}"
RDS_ENGINE_VERSION="${SWAT_RDS_ENGINE_VERSION:-15.19}"
RDS_PARAM_GROUP="swat-pg15"
RDS_MASTER_USER="${SWAT_RDS_MASTER_USER:-swatmaster}"
TARGET_DB="swat_staging"
APP_DB_ROLE="swat"

# S3. The old names are still held by the closed account (buckets are global), so
# these carry an `-id` suffix — same convention the sibling project adopted.
PHOTOS_BUCKET="${SWAT_PHOTOS_BUCKET:-swat-photos-staging-id}"
REPORTS_BUCKET="${SWAT_REPORTS_BUCKET:-swat-reports-staging-id}"

# ECR + IAM
ECR_REPOS=(swat-backend swat-web swat-docs)
ECR_KEEP_IMAGES="${SWAT_ECR_KEEP_IMAGES:-3}"   # 500 MB free-tier allowance
GITHUB_REPO="dlhsby/swat"
GHA_ROLE_NAME="swat-gha-deploy"
CLI_USER_NAME="${SWAT_CLI_USER:-dlhsby-swat-staging-cli}"
EC2_ROLE_NAME="swat-ec2"

# Security groups
WEB_SG_NAME="swat-web-sg"
DB_SG_NAME="swat-db-sg"

# Alerting / cost guardrails
ALERT_EMAIL="${SWAT_ALERT_EMAIL:-admin@wahyutrip.com}"
SNS_TOPIC_NAME="swat-staging-alerts"
BUDGET_LIMIT_USD="${SWAT_BUDGET_LIMIT_USD:-1}"

# SSM parameter namespace
SSM_PREFIX="/swat/staging"

ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Every provisioner calls AWS through this so the profile/region are never forgotten.
aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }
say() { printf '\n=== %s ===\n' "$1"; }
have() { "$@" >/dev/null 2>&1; }
