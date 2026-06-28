#!/usr/bin/env bash
#
# SWAT — start the local dev stack.
# Ensures the Docker infrastructure is up, then runs backend + web together in
# watch mode. Ports come from .env.local (BE_PORT / WEB_PORT; default 3000 /
# 3001). Run ./scripts/setup.sh once first.
#
#   ./scripts/start.sh             # infra + both apps (pnpm dev)
#   ./scripts/start.sh --infra     # only start/ensure the Docker infra
#   ./scripts/start.sh --no-docker # skip Docker, just run the apps
#   ./scripts/start.sh --clean     # wipe web .next + backend dist first
#                                  # (use after adding/moving routes or pnpm install)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INFRA_ONLY=0
START_DOCKER=1
CLEAN=0
for arg in "$@"; do
  case "$arg" in
    --infra) INFRA_ONLY=1 ;;
    --no-docker) START_DOCKER=0 ;;
    --clean | --fresh) CLEAN=1 ;;
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
die() {
  printf '\033[1;31m✖ %s\033[0m\n' "$1" >&2
  exit 1
}

[ -f '.env.local' ] || die '.env.local not found. Run ./scripts/setup.sh first.'

# Load local env and export it so BOTH apps inherit it. This matters because
# `next dev` reads WEB_PORT from the shell (not from .env files), and a real
# exported env var overrides any app-local .env.local — so root .env.local
# stays the single source of truth for BE_PORT / WEB_PORT /
# NEXT_PUBLIC_API_BASE_URL across the monorepo.
set -a
# shellcheck source=/dev/null
. ./.env.local
set +a

if [ "$START_DOCKER" = 1 ]; then
  command -v docker >/dev/null || die 'Docker not found. Use --no-docker to skip.'
  log 'Ensuring Docker infrastructure is up'
  docker compose --env-file infra/docker-compose.env up -d
  docker compose --env-file infra/docker-compose.env ps
fi

if [ "$INFRA_ONLY" = 1 ]; then
  log 'Infrastructure ready (--infra). Apps not started.'
  exit 0
fi

# --clean: drop the dev build caches so Turbopack/SWC re-scan from scratch. Only
# needed after structural changes (added/moved/deleted routes, pnpm install) — a
# normal start keeps the caches for fast warm reloads.
if [ "$CLEAN" = 1 ]; then
  log 'Cleaning dev build caches (apps/web/.next, apps/backend/dist)'
  rm -rf apps/web/.next apps/backend/dist
fi

log "Starting apps — backend :${BE_PORT:-3000} · web :${WEB_PORT:-3001}  (Ctrl-C to stop)"
exec pnpm dev
