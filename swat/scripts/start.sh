#!/usr/bin/env bash
#
# SWAT — start the local dev stack.
# Ensures the Docker infrastructure is up, then runs backend (:3000) and
# web (:3001) together in watch mode. Run ./scripts/setup.sh once first.
#
#   ./scripts/start.sh             # infra + both apps (pnpm dev)
#   ./scripts/start.sh --infra     # only start/ensure the Docker infra
#   ./scripts/start.sh --no-docker # skip Docker, just run the apps
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INFRA_ONLY=0
START_DOCKER=1
for arg in "$@"; do
  case "$arg" in
    --infra) INFRA_ONLY=1 ;;
    --no-docker) START_DOCKER=0 ;;
    -h | --help)
      grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | head -10
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

log 'Starting apps — backend :3000 · web :3001  (Ctrl-C to stop)'
exec pnpm dev
