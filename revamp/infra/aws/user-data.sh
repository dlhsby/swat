#!/usr/bin/env bash
# EC2 user-data for the SWAT staging box (Amazon Linux 2023).
#
# Runs ONCE at first boot as root. Everything here must be idempotent anyway —
# it is also safe to re-run by hand over SSM if the box is ever rebuilt.
#
# Deliberately minimal: the box only needs Docker + the compose plugin + swap.
# The application stack, its Caddy TLS edge and its env all arrive at deploy time
# (see .github/workflows/deploy-staging.yml), so nothing app-specific lives here.
set -euxo pipefail

# --- Swap ------------------------------------------------------------------
# 2 GB of swap. Even on t3.small the Next.js + Nest containers plus the deploy's
# `docker build`-less pull spike past RAM occasionally; swap turns an OOM-kill
# into a slow second. fstab entry so it survives a reboot.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# Prefer RAM; only spill under real pressure.
sysctl -w vm.swappiness=10
grep -q '^vm.swappiness' /etc/sysctl.d/99-swat.conf 2>/dev/null || echo 'vm.swappiness=10' > /etc/sysctl.d/99-swat.conf

# --- Docker ----------------------------------------------------------------
dnf install -y docker
systemctl enable --now docker
usermod -aG docker ec2-user

# Compose v2 is NOT in the AL2023 repos — install the plugin binary directly.
# Pinned: an unpinned "latest" would silently change the deploy's compose semantics.
COMPOSE_VERSION=v2.32.4
install -d /usr/libexec/docker/cli-plugins
curl -fsSL -o /usr/libexec/docker/cli-plugins/docker-compose \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)"
chmod +x /usr/libexec/docker/cli-plugins/docker-compose
docker compose version

# --- Log rotation ----------------------------------------------------------
# compose.staging.yml caps per-container json logs, but the docker daemon's own
# defaults are unbounded for anything started outside it.
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
systemctl restart docker

# --- Deploy target dir -----------------------------------------------------
# The deploy writes compose.staging.yml / Caddyfile.staging / seed-env-from-ssm.sh
# here as ec2-user, and seed-env-from-ssm.sh materializes /opt/swat/.env.
install -d -o ec2-user -g ec2-user /home/ec2-user/swat/infra
install -d -o ec2-user -g ec2-user /opt/swat

# --- Nightly logical backup ------------------------------------------------
# AL2023 ships NO cron — this is a systemd timer. RDS automated backups are capped
# at 1 day of retention on the free plan and cross-account snapshot restore is
# blocked, so this pg_dump to S3 is the real recovery path.
dnf install -y postgresql15
install -m 0755 /dev/stdin /usr/local/bin/swat-pg-backup.sh <<'BACKUP'
#!/usr/bin/env bash
# Nightly pg_dump of swat_staging to S3. Runs on the box as root via a systemd
# timer; credentials come from SSM via the instance role (never on disk).
set -euo pipefail
REGION="$(curl -fsS http://169.254.169.254/latest/meta-data/placement/region \
  -H "X-aws-ec2-metadata-token: $(curl -fsS -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')")"
export AWS_DEFAULT_REGION="$REGION"
get() { aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text; }
HOST="$(get /swat/staging/RDS_HOST)"
USER="$(get /swat/staging/RDS_MASTER_USERNAME)"
PGPASSWORD="$(get /swat/staging/RDS_MASTER_PASSWORD)"; export PGPASSWORD
BUCKET="$(get /swat/staging/BACKUP_BUCKET)"
KEY="backups/swat_staging-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump -Fc -h "$HOST" -U "$USER" -d swat_staging \
  | aws s3 cp - "s3://${BUCKET}/${KEY}" --expected-size 2000000000
echo "backup complete: s3://${BUCKET}/${KEY}"
BACKUP

cat > /etc/systemd/system/swat-pg-backup.service <<'UNIT'
[Unit]
Description=SWAT staging nightly logical backup (pg_dump -> S3)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/swat-pg-backup.sh
UNIT

cat > /etc/systemd/system/swat-pg-backup.timer <<'UNIT'
[Unit]
Description=Run the SWAT staging logical backup nightly

[Timer]
# 18:30 UTC = 01:30 WIB — after the operational day, before the morning shift.
OnCalendar=*-*-* 18:30:00
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now swat-pg-backup.timer

echo "SWAT staging box bootstrap complete."
