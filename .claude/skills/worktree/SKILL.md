---
name: worktree
description: Create, cleanup, or list git worktrees for parallel SWAT work, wired to run alongside the main worktree on the shared Docker infra (Postgres/Redis/MinIO) with distinct BE/WEB ports. Use when the user wants to start a new parallel workstream, spin up a worktree, clean up a finished worktree, or list existing worktrees. Wraps revamp/scripts/worktree.sh.
allowed-tools: Bash, Read
---

# SWAT Worktree Manager

Thin wrapper around `revamp/scripts/worktree.sh` (relative to the outer repo
root — the git repo root is `projects/swat/`, NOT the inner `revamp/` dir; see
CLAUDE.md "Layout"). Do not reimplement its logic — always shell out to it.

## Arguments

The user may invoke this as `/worktree`, `/worktree <name>`, `/worktree cleanup
<name>`, `/worktree list`, etc. Parse the trailing text after `/worktree` as
raw arguments to pass through.

## Instructions

1. Resolve the outer repo root (the directory containing `.git` and the inner
   `revamp/` dir — usually the current working directory or an ancestor).
2. Decide the subcommand from what the user asked for:
   - Creating/starting new parallel work → `create` (or no subcommand — it's
     the default). If the user gave a work name, pass it directly; otherwise
     let the script prompt interactively.
   - Finishing/removing a worktree → `cleanup`. If the user names it, pass
     the name; if they say "this one" / "current" while cd'd into a worktree,
     omit the name and let the script auto-detect from cwd.
   - Listing worktrees / checking status → `list`.
3. Run it directly so prompts (name, ports, confirmations) reach the user's
   terminal — do not capture/suppress stdin:
   ```
   ./revamp/scripts/worktree.sh <subcommand> [args...]
   ```
   (path relative to the outer repo root; adjust if invoked from elsewhere).
4. For `create`, after it finishes, tell the user the worktree dir, branch,
   and BE/WEB ports it was wired to, plus the `cd` + `./scripts/start.sh
   --no-docker` next step already printed by the script.
5. For `cleanup`, if the script warns about uncommitted changes or unmerged
   commits, relay that warning plainly and let the user decide — don't
   auto-confirm on their behalf, and never pass `--force` unless the user
   explicitly asked to force it.
6. For `list`, just show the table output as-is.

## Notes

- Worktrees live at `.claude/worktrees/<name>` on branch `worktree-<name>`,
  cut from `origin/<base>` (default `main`) after a fetch — never from local
  main.
- Shared infra: `infra/docker-compose.env` is never copied into a new
  worktree, and `DATABASE_URL`/`REDIS_URL`/`S3_*` are left untouched — every
  worktree talks to the same running Postgres/Redis/MinIO as the main
  worktree. Only `BE_PORT`, `WEB_PORT`, `NEXT_PUBLIC_API_BASE_URL`, and
  `CORS_ORIGIN` are rewired per worktree.
- Full usage/help: `./revamp/scripts/worktree.sh --help`.
