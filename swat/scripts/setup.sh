#!/usr/bin/env bash
#
# SWAT — one-time local setup.
# Idempotent: safe to re-run. Bootstraps env files, installs deps, starts the
# Docker infrastructure, applies migrations, and seeds the database.
#
#   ./scripts/setup.sh             # reference + lookup data only
#   ./scripts/setup.sh --synthetic # also seed ~365 days of synthetic trips
#   ./scripts/setup.sh --no-docker # skip starting containers (infra already up)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SYNTHETIC=0
START_DOCKER=1
for arg in "$@"; do
  case "$arg" in
    --synthetic) SYNTHETIC=1 ;;
    --no-docker) START_DOCKER=0 ;;
    -h | --help)
      grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | head -12
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

log() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$1"; }
die() {
  printf '\033[1;31m✖ %s\033[0m\n' "$1" >&2
  exit 1
}

# --- 0. Prerequisites -------------------------------------------------------
log 'Checking prerequisites'
command -v node >/dev/null || die 'Node.js not found (need >= 20).'
command -v pnpm >/dev/null || die 'pnpm not found. Run: corepack enable'
if [ "$START_DOCKER" = 1 ]; then
  command -v docker >/dev/null || die 'Docker not found. Install Docker, or pass --no-docker.'
  docker compose version >/dev/null 2>&1 || die 'Docker Compose v2 not available (need "docker compose").'
fi
echo "node $(node -v) · pnpm $(pnpm -v)"

# --- 1. Env files (copy from templates if missing) --------------------------
log 'Preparing env files'
copy_if_missing() {
  if [ -f "$1" ]; then
    echo "exists: $1"
  else
    cp "$2" "$1"
    echo "created: $1 (from $2)"
  fi
}
copy_if_missing '.env.local' '.env.example'
copy_if_missing 'apps/backend/prisma/.env' 'apps/backend/prisma/.env.example'
copy_if_missing 'infra/docker-compose.env' 'infra/docker-compose.env.example'
warn 'Review .env.local and set strong SESSION_SECRET / JWT_SECRET for non-local use.'

# --- 2. Install dependencies ------------------------------------------------
log 'Installing dependencies (pnpm install)'
pnpm install

# --- 3. Start infrastructure ------------------------------------------------
if [ "$START_DOCKER" = 1 ]; then
  log 'Starting Docker infrastructure'
  docker compose --env-file infra/docker-compose.env up -d

  log 'Waiting for PostgreSQL to be ready'
  for i in $(seq 1 30); do
    if docker compose --env-file infra/docker-compose.env exec -T postgres \
      pg_isready -U "${POSTGRES_USER:-swat}" -d "${POSTGRES_DB:-swat}" >/dev/null 2>&1; then
      echo 'PostgreSQL is ready.'
      break
    fi
    [ "$i" = 30 ] && die 'PostgreSQL did not become ready in time.'
    sleep 2
  done
else
  warn 'Skipping Docker (--no-docker). Ensure Postgres/Redis/MinIO are reachable.'
fi

# --- 4. Migrate + generate client -------------------------------------------
log 'Applying database migrations (prisma migrate deploy)'
pnpm --filter @swat/backend run prisma:deploy
pnpm --filter @swat/backend run prisma:generate

# --- 5. Seed ----------------------------------------------------------------
log 'Seeding database'
if [ "$SYNTHETIC" = 1 ]; then
  echo 'Including synthetic 365-day dataset (SEED_SYNTHETIC=1).'
  SEED_SYNTHETIC=1 pnpm --filter @swat/backend run prisma:seed
else
  pnpm --filter @swat/backend run prisma:seed
fi

log 'Setup complete ✓'
cat <<'EOF'

Next:
  ./scripts/start.sh        # run backend (:3000) + web (:3001)

Default admin login:  admin / ChangeMe!2026  (must change on first login)
Adminer:  http://localhost:8080   ·   MinIO console:  http://localhost:9001
EOF
