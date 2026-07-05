#!/usr/bin/env bash
#
# SWAT — create/cleanup a git worktree for parallel work, wired to run
# alongside the main worktree against the SAME shared infra (Postgres/Redis/
# MinIO), just on different BE/WEB ports.
#
# Create: the worktree branch is always cut from origin/<base> (default:
# origin/main) after a fetch, so you start from what's actually merged
# upstream — not whatever your local main happens to be at.
#
#   ./scripts/worktree.sh                              # prompts for a name
#   ./scripts/worktree.sh create gps-retry-logic        # name as arg
#   ./scripts/worktree.sh gps-retry-logic               # "create" is the default action
#   ./scripts/worktree.sh gps-retry-logic --base staging
#   ./scripts/worktree.sh gps-retry-logic --be-port 4030 --web-port 4031
#
# Cleanup: removes the worktree dir and its branch.
#
#   ./scripts/worktree.sh cleanup gps-retry-logic       # by name, from anywhere
#   ./scripts/worktree.sh cleanup                       # detects the worktree you're cd'd into
#   ./scripts/worktree.sh cleanup gps-retry-logic --force  # skip dirty/unmerged confirmations
#
# List: shows every worktree under .claude/worktrees with its branch, ports,
# and working-tree status.
#
#   ./scripts/worktree.sh list
#
# Worktrees live under .claude/worktrees/<name> (gitignored), each on its own
# branch worktree-<name>.
#
set -euo pipefail

# Outer git repo root (the monorepo lives in the inner revamp/ dir, but git
# itself is rooted one level up — see CLAUDE.md "Layout").
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REVAMP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$REVAMP_ROOT/.." && pwd)"

log() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$1"; }
die() {
  printf '\033[1;31m✖ %s\033[0m\n' "$1" >&2
  exit 1
}

show_help() {
  grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' | head -30
}

# --- Action dispatch ---------------------------------------------------
ACTION="create"
if [ $# -gt 0 ]; then
  case "$1" in
    create)
      ACTION=create
      shift
      ;;
    cleanup | remove | rm)
      ACTION=cleanup
      shift
      ;;
    list | ls)
      ACTION=list
      shift
      ;;
    -h | --help)
      show_help
      exit 0
      ;;
  esac
fi

cmd_create() {
  cd "$REPO_ROOT"

  local NAME="" BASE="main" BE_PORT="" WEB_PORT=""

  # First positional arg (if any, and not an option) is the name.
  if [ $# -gt 0 ] && [[ "$1" != -* ]]; then
    NAME="$1"
    shift
  fi

  while [ $# -gt 0 ]; do
    case "$1" in
      --base)
        BASE="$2"
        shift 2
        ;;
      --be-port)
        BE_PORT="$2"
        shift 2
        ;;
      --web-port)
        WEB_PORT="$2"
        shift 2
        ;;
      -h | --help)
        show_help
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  # --- 1. Work name -------------------------------------------------------
  if [ -z "$NAME" ]; then
    read -rp 'Name of the work (used for branch/dir, e.g. "gps-retry-logic"): ' NAME
  fi
  [ -n "$NAME" ] || die 'A name is required.'

  # Slugify: lowercase, spaces/underscores -> hyphens, strip anything else.
  NAME="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | tr -cd 'a-z0-9-')"
  [ -n "$NAME" ] || die 'Name resolved to empty after slugifying.'

  local WT_DIR="$REPO_ROOT/.claude/worktrees/$NAME"
  local BRANCH="worktree-$NAME"

  [ -e "$WT_DIR" ] && die "Worktree dir already exists: $WT_DIR"
  git show-ref --verify --quiet "refs/heads/$BRANCH" &&
    die "Branch already exists: $BRANCH (pick a different name, or remove it with 'git branch -D $BRANCH')"

  # --- 2. Fetch + create worktree off origin/<base> -----------------------
  log "Fetching origin/$BASE"
  git fetch origin "$BASE"

  log "Creating worktree '$BRANCH' at $WT_DIR (from origin/$BASE)"
  git worktree add -b "$BRANCH" "$WT_DIR" "origin/$BASE"

  local WT_REVAMP="$WT_DIR/revamp"
  [ -d "$WT_REVAMP" ] || die "Expected inner dir not found: $WT_REVAMP"

  # --- 3. Copy env files from the main worktree ----------------------------
  log 'Copying env files from the main worktree'
  copy_env() {
    local src="$REVAMP_ROOT/$1" dst="$WT_REVAMP/$1"
    if [ -f "$src" ]; then
      mkdir -p "$(dirname "$dst")"
      cp "$src" "$dst"
      echo "copied: $1"
    else
      warn "source env missing, skipped: $1 (run ./scripts/setup.sh in the main worktree first)"
    fi
  }
  copy_env '.env.local'
  copy_env 'apps/web/.env.local'
  copy_env 'apps/backend/prisma/.env'

  # infra/docker-compose.env is deliberately NOT copied: this worktree shares the
  # main worktree's already-running Docker infra (Postgres/Redis/MinIO) rather
  # than standing up its own stack.

  # --- 4. Ports -------------------------------------------------------------
  # Suggest ports clear of the main worktree's 4020/4021 and any other worktree
  # already on disk, by scanning their .env.local files.
  suggest_port() {
    local base="$1" used
    used="$(grep -hoE "^${2}=[0-9]+" "$REPO_ROOT"/.claude/worktrees/*/revamp/.env.local 2>/dev/null | cut -d= -f2)"
    used+=" $(grep -hoE "^${2}=[0-9]+" "$REVAMP_ROOT/.env.local" 2>/dev/null | cut -d= -f2)"
    local port="$base"
    while echo "$used" | grep -qw "$port"; do
      port=$((port + 10))
    done
    echo "$port"
  }

  if [ -z "$BE_PORT" ]; then
    local suggested_be
    suggested_be="$(suggest_port 4030 BE_PORT)"
    read -rp "Backend port for this worktree [$suggested_be]: " BE_PORT
    BE_PORT="${BE_PORT:-$suggested_be}"
  fi
  if [ -z "$WEB_PORT" ]; then
    local suggested_web
    suggested_web="$(suggest_port 4031 WEB_PORT)"
    read -rp "Web port for this worktree [$suggested_web]: " WEB_PORT
    WEB_PORT="${WEB_PORT:-$suggested_web}"
  fi

  log "Wiring ports — backend :$BE_PORT · web :$WEB_PORT (shared infra: Postgres/Redis/MinIO unchanged)"

  set_kv() {
    local file="$1" key="$2" value="$3"
    [ -f "$file" ] || return 0
    if grep -q "^${key}=" "$file"; then
      local tmp
      tmp="$(mktemp)"
      sed "s|^${key}=.*|${key}=${value}|" "$file" >"$tmp" && mv "$tmp" "$file"
    else
      printf '%s=%s\n' "$key" "$value" >>"$file"
    fi
  }

  set_kv "$WT_REVAMP/.env.local" BE_PORT "$BE_PORT"
  set_kv "$WT_REVAMP/.env.local" WEB_PORT "$WEB_PORT"
  set_kv "$WT_REVAMP/.env.local" NEXT_PUBLIC_API_BASE_URL "http://localhost:$BE_PORT"
  set_kv "$WT_REVAMP/.env.local" CORS_ORIGIN "http://localhost:$WEB_PORT"
  set_kv "$WT_REVAMP/apps/web/.env.local" NEXT_PUBLIC_API_BASE_URL "http://localhost:$BE_PORT"

  # --- 5. Install deps + generate Prisma client -----------------------------
  log 'Installing dependencies in the new worktree (pnpm install)'
  (cd "$WT_REVAMP" && pnpm install)

  log 'Generating Prisma client'
  (cd "$WT_REVAMP" && pnpm --filter @swat/backend run prisma:generate)

  log 'Worktree ready ✓'
  cat <<EOF

  dir:        $WT_REVAMP
  branch:     $BRANCH (from origin/$BASE)
  backend:    http://localhost:$BE_PORT
  web:        http://localhost:$WEB_PORT
  infra:      shared with the main worktree — do NOT run docker compose here

Next:
  cd '$WT_REVAMP'
  ./scripts/start.sh --no-docker   # infra is already running from the main worktree

Cleanup when done:
  ./scripts/worktree.sh cleanup $NAME
EOF
}

cmd_cleanup() {
  local NAME="" FORCE=0

  if [ $# -gt 0 ] && [[ "$1" != -* ]]; then
    NAME="$1"
    shift
  fi

  while [ $# -gt 0 ]; do
    case "$1" in
      --force | -f)
        FORCE=1
        shift
        ;;
      -h | --help)
        show_help
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  local INSIDE_TARGET=0

  if [ -z "$NAME" ]; then
    # Detect from cwd: are we somewhere under .claude/worktrees/<name>/...?
    case "$PWD/" in
      "$REPO_ROOT/.claude/worktrees/"*)
        local rel="${PWD#"$REPO_ROOT"/.claude/worktrees/}"
        NAME="${rel%%/*}"
        ;;
      *)
        die 'No name given and current directory is not inside .claude/worktrees/<name>. Pass a name: ./scripts/worktree.sh cleanup <name>'
        ;;
    esac
  fi

  NAME="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | tr -cd 'a-z0-9-')"
  [ -n "$NAME" ] || die 'Name resolved to empty after slugifying.'

  local WT_DIR="$REPO_ROOT/.claude/worktrees/$NAME"
  local BRANCH="worktree-$NAME"

  [ -d "$WT_DIR" ] || die "No worktree found at $WT_DIR"
  case "$PWD/" in
    "$WT_DIR"/* | "$WT_DIR/") INSIDE_TARGET=1 ;;
  esac

  log "Cleaning up worktree '$NAME'"

  local dirty
  dirty="$(git -C "$WT_DIR" status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ] && [ "$FORCE" != 1 ]; then
    warn 'Worktree has uncommitted changes:'
    echo "$dirty"
    read -rp 'Remove anyway and discard them? [y/N] ' ans
    [[ "$ans" =~ ^[Yy]$ ]] || die 'Aborted.'
  fi

  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    local unmerged
    unmerged="$(git -C "$REPO_ROOT" log --oneline "origin/main..$BRANCH" 2>/dev/null || true)"
    if [ -n "$unmerged" ] && [ "$FORCE" != 1 ]; then
      warn "Branch '$BRANCH' has commits not in origin/main:"
      echo "$unmerged"
      read -rp 'Remove the worktree and delete the branch anyway? [y/N] ' ans
      [[ "$ans" =~ ^[Yy]$ ]] || die 'Aborted. Push/merge the branch first, or re-run with --force.'
    fi
  fi

  log "Removing worktree dir $WT_DIR"
  (cd "$REPO_ROOT" && git worktree remove "$WT_DIR" $([ "$FORCE" = 1 ] && echo --force))

  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    log "Deleting branch $BRANCH"
    (cd "$REPO_ROOT" && git branch -D "$BRANCH")
  fi

  log "Worktree '$NAME' removed ✓"
  if [ "$INSIDE_TARGET" = 1 ]; then
    warn "You were cd'd into the removed worktree — your shell's cwd is now stale. Run: cd '$REPO_ROOT'"
  fi
}

cmd_list() {
  local dir="$REPO_ROOT/.claude/worktrees"
  if [ ! -d "$dir" ] || [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
    echo 'No worktrees under .claude/worktrees.'
    return 0
  fi

  printf '%-28s %-38s %-8s %-8s %s\n' 'NAME' 'BRANCH' 'BE_PORT' 'WEB_PORT' 'STATUS'
  local wt_dir name branch be_port web_port status dirty ahead
  for wt_dir in "$dir"/*/; do
    wt_dir="${wt_dir%/}"
    name="$(basename "$wt_dir")"
    branch="worktree-$name"

    be_port="$(grep -oE '^BE_PORT=[0-9]+' "$wt_dir/revamp/.env.local" 2>/dev/null | cut -d= -f2)"
    web_port="$(grep -oE '^WEB_PORT=[0-9]+' "$wt_dir/revamp/.env.local" 2>/dev/null | cut -d= -f2)"

    status='clean'
    dirty="$(git -C "$wt_dir" status --porcelain 2>/dev/null || true)"
    [ -n "$dirty" ] && status='dirty'

    if git show-ref --verify --quiet "refs/heads/$branch"; then
      ahead="$(git -C "$REPO_ROOT" rev-list --count "origin/main..$branch" 2>/dev/null || echo 0)"
      [ "$ahead" != 0 ] && status="$status, +$ahead unmerged"
    else
      status="$status, no branch $branch"
    fi

    printf '%-28s %-38s %-8s %-8s %s\n' "$name" "$branch" "${be_port:-?}" "${web_port:-?}" "$status"
  done
}

case "$ACTION" in
  create) cmd_create "$@" ;;
  cleanup) cmd_cleanup "$@" ;;
  list) cmd_list "$@" ;;
esac
