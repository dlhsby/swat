# SWAT — Project Guide

Concise orientation so sessions don't re-explore. Global directives live in `~/.claude/CLAUDE.md`.

## Layout
- **Monorepo lives in the inner `swat/` dir** (`projects/swat/swat/`), NOT the project root.
  Run all package-manager commands from there.
- **Git repo root is the outer `projects/swat/`** → `.github/workflows/` sits at the outer root
  (CI uses `working-directory: swat`). Husky: enable with `git config core.hooksPath swat/.husky`.
- Project root also holds `specs/`, `designs/`, `old_swat/` (legacy CI app), `prompts/`.

## Stack
pnpm + Turborepo · NestJS 10 + Prisma 5 + Postgres 15 · Next 14 + Tailwind 3 + next-intl 3.
Packages: `@swat/{schemas,prisma-client,eslint-config,tsconfig}`; backend = `@swat/backend`.
Admin seed login: `admin / ChangeMe!2026`.

## Package manager: pnpm (NOT npm)
From inner `swat/`:
- Build: `pnpm build` · Dev: `pnpm dev` · Lint: `pnpm lint` (`pnpm lint:fix`) · Types: `pnpm typecheck`
- Test: `pnpm test` · Format: `pnpm format` / `pnpm format:check`
- DB: `pnpm db:generate` · `pnpm db:migrate` (= prisma **deploy**) · `pnpm db:seed`
- Scope one package: `pnpm --filter @swat/backend run <script>`

## Gotchas
- **Partitioned tables** (`Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`) are converted to native
  monthly RANGE partitions by a raw-SQL migration (`*_partition_transactions`). PKs are
  `(operationDate, id)`; `legacyId` is a plain index. These are **migration-managed** — use
  `prisma migrate deploy`, **never `migrate dev`**, or Prisma reports drift.
- **Docker is NOT available** in this WSL distro. Phase 0 = "scaffold-all, defer live infra":
  code/lint/typecheck/build/test/prisma-validate verified locally; `docker compose`,
  `migrate deploy`, `db seed`, partition-pruning, MinIO/Redis live checks are the user's to run
  after enabling Docker.

## Git / GitHub
- Remote: `git@github-personal:dlhsby/swat.git` (private). The `github-personal` SSH alias maps to
  the **`wahyutrip`** account (admin of `dlhsby` org). For any `dlhsby/*` git or `gh` work:
  `gh auth switch --user wahyutrip`. The `wahyutrip-gdp` account cannot push to org repos.
- CI: `.github/workflows/ci.yml` runs on Node 24, actions at v6; `pnpm/action-setup` pinned to
  `version: 9` (runs at repo root while `packageManager` lives in inner `swat/package.json`).
