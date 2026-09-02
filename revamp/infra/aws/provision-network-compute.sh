#!/usr/bin/env bash
# SWAT staging provisioning — part 2/3: security groups, S3 endpoint, EC2, Elastic IP.
#
# Idempotent. Depends on part 1 (the instance profile must exist).
#
# Cost notes that shape every choice here:
#   - NO NAT gateway. ~$35/mo and nothing needs one — the box sits in a PUBLIC
#     subnet behind the internet gateway the default VPC already has.
#   - Exactly ONE public IPv4. Every public IPv4 is billed (~$3.60/mo) since
#     Feb 2024; an unassociated Elastic IP is billed too, so we never leave one.
#   - S3 traffic goes through a GATEWAY endpoint (free). Interface endpoints are
#     NOT free — none are created.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=staging.config.sh
source "$HERE/staging.config.sh"

say "Default VPC + the ${AZ} subnet"
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)"
[[ "$VPC_ID" != "None" && -n "$VPC_ID" ]] || { echo "ERROR: no default VPC in $REGION." >&2; exit 1; }

# Pin the subnet to the chosen AZ; RDS is placed in the SAME AZ in part 3 so that
# every backend->DB query is intra-AZ (free) rather than cross-AZ (billed both ways).
SUBNET_ID="$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=$AZ" "Name=default-for-az,Values=true" \
  --query 'Subnets[0].SubnetId' --output text)"
[[ "$SUBNET_ID" != "None" && -n "$SUBNET_ID" ]] || { echo "ERROR: no default subnet in $AZ." >&2; exit 1; }
echo "vpc=$VPC_ID subnet=$SUBNET_ID az=$AZ"

# ---------------------------------------------------------------------------
say "Security groups"
sg_id() {
  aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$1" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null
}
ensure_sg() {
  local name="$1" desc="$2" id
  id="$(sg_id "$name")"
  if [[ "$id" == "None" || -z "$id" ]]; then
    id="$(aws ec2 create-security-group --group-name "$name" --description "$desc" \
      --vpc-id "$VPC_ID" --query GroupId --output text)"
    echo "created: $name ($id)" >&2
  else
    echo "exists: $name ($id)" >&2
  fi
  printf '%s' "$id"
}
WEB_SG="$(ensure_sg "$WEB_SG_NAME" 'SWAT staging: public HTTP/HTTPS')"
DB_SG="$(ensure_sg "$DB_SG_NAME" 'SWAT staging: Postgres from the app box only')"

# 80 is required as well as 443: Caddy answers the Let's Encrypt HTTP-01 challenge
# on it and redirects everything else to HTTPS. No SSH rule — access is SSM only.
for port in 80 443; do
  have aws ec2 authorize-security-group-ingress --group-id "$WEB_SG" \
    --protocol tcp --port "$port" --cidr 0.0.0.0/0 \
    && echo "opened: ${port}/tcp on $WEB_SG_NAME" || true
done
# Postgres reachable ONLY from the app box's security group, never from the internet.
have aws ec2 authorize-security-group-ingress --group-id "$DB_SG" \
  --protocol tcp --port 5432 --source-group "$WEB_SG" \
  && echo "opened: 5432/tcp on $DB_SG_NAME from $WEB_SG_NAME" || true

# ---------------------------------------------------------------------------
say "S3 gateway VPC endpoint (free; keeps bucket traffic off the public path)"
if aws ec2 describe-vpc-endpoints \
     --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.${REGION}.s3" \
     --query 'VpcEndpoints[0].VpcEndpointId' --output text | grep -qv '^None$'; then
  echo "exists: S3 gateway endpoint"
else
  RTBS="$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[].RouteTableId' --output text)"
  # shellcheck disable=SC2086
  aws ec2 create-vpc-endpoint --vpc-id "$VPC_ID" --vpc-endpoint-type Gateway \
    --service-name "com.amazonaws.${REGION}.s3" --route-table-ids $RTBS >/dev/null
  echo "created: S3 gateway endpoint on route tables: $RTBS"
fi

# ---------------------------------------------------------------------------
say "EC2 instance ($INSTANCE_NAME, $INSTANCE_TYPE, $AZ)"
INSTANCE_ID="$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)"

if [[ "$INSTANCE_ID" != "None" && -n "$INSTANCE_ID" ]]; then
  echo "exists: $INSTANCE_ID"
else
  # Resolve the current AL2023 AMI from the SSM public parameter rather than
  # pinning an id — AMI ids are per-region and go stale on every release.
  AMI_ID="$(aws ssm get-parameter \
    --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
    --query Parameter.Value --output text)"
  echo "ami: $AMI_ID"
  INSTANCE_ID="$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --subnet-id "$SUBNET_ID" \
    --security-group-ids "$WEB_SG" \
    --iam-instance-profile "Name=$EC2_ROLE_NAME" \
    --user-data "file://$HERE/user-data.sh" \
    --metadata-options 'HttpTokens=required,HttpEndpoint=enabled' \
    --block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":${ROOT_VOLUME_GB},\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true,\"Encrypted\":true}}]" \
    --tag-specifications \
      "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=swat-staging}]" \
      "ResourceType=volume,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=swat-staging}]" \
    --query 'Instances[0].InstanceId' --output text)"
  echo "created: $INSTANCE_ID — waiting for running…"
  aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
fi

# The Project tag is what the GitHub deploy role's ssm:SendCommand condition keys
# off, so re-apply it even on a pre-existing instance.
aws ec2 create-tags --resources "$INSTANCE_ID" \
  --tags "Key=Name,Value=$INSTANCE_NAME" "Key=Project,Value=swat-staging" >/dev/null

# ---------------------------------------------------------------------------
say "Elastic IP"
# One address, always associated. An idle EIP is billed at the same rate as an
# attached one, so we never allocate a spare.
ALLOC_ID="$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=$INSTANCE_NAME" \
  --query 'Addresses[0].AllocationId' --output text)"
if [[ "$ALLOC_ID" == "None" || -z "$ALLOC_ID" ]]; then
  ALLOC_ID="$(aws ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=swat-staging}]" \
    --query AllocationId --output text)"
  echo "allocated: $ALLOC_ID"
fi
CURRENT_ASSOC="$(aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" \
  --query 'Addresses[0].InstanceId' --output text)"
if [[ "$CURRENT_ASSOC" != "$INSTANCE_ID" ]]; then
  aws ec2 associate-address --allocation-id "$ALLOC_ID" --instance-id "$INSTANCE_ID" >/dev/null
  echo "associated to $INSTANCE_ID"
fi
EIP="$(aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" --query 'Addresses[0].PublicIp' --output text)"

say "Part 2 done"
echo "instance: $INSTANCE_ID"
echo "elastic ip: $EIP"
echo
echo "DNS — point these at $EIP before the first deploy (Caddy needs them live to"
echo "issue Let's Encrypt certs; if Cloudflare-proxied, set them to DNS-only/grey):"
echo "  swat.wahyutrip.com       A  $EIP"
echo "  api.swat.wahyutrip.com   A  $EIP"
echo "  docs.swat.wahyutrip.com  A  $EIP"
