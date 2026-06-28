# SWAT — DLH Kota Surabaya

**Sistem Pengangkutan Sampah Terpadu** — the integrated solid-waste-transport
operations platform for Dinas Lingkungan Hidup Kota Surabaya. This repository
holds the rebuild of the legacy CodeIgniter app on a modern TypeScript stack,
plus all specs, designs, ops docs, and the legacy reference app.

> **The application lives in [`revamp/`](./revamp/)** — a pnpm + Turborepo monorepo
> (NestJS + Next.js + Postgres/Prisma). Run all package-manager commands from
> there. **New here? Jump to [Quick start](#quick-start).**
> _(This dir was named `swat/` before 2026-06; the legacy app moved from `old_swat/` to `legacy/`.)_

## Repository layout

This git repo root is the **outer** `projects/swat/`; the monorepo is the inner `revamp/`.

```
projects/swat/                 ← git repo root (you are here)
├── revamp/                    ← THE MONOREPO — apps/web, apps/backend, packages/, infra/
│   ├── apps/backend/          NestJS API (Prisma schema, migrations, seed, migration scripts)
│   ├── apps/web/              Next.js PWA
│   ├── packages/              @swat/{schemas,prisma-client,eslint-config,tsconfig}
│   ├── scripts/               setup.sh (bootstrap) · start.sh (run)
│   └── docker-compose.yml     Postgres · Redis · MinIO · Adminer · nginx
├── specs/                     Authoritative requirements + phased dev plan (11-development-plan/)
├── designs/                   Visual source of truth (Claude Design handoff bundle)
├── docs/                      Cutover runbook, rollback, user guide, dependency upgrade, etc.
├── legacy/                    Archived legacy system — web/ (old CodeIgniter app, was old_swat/) + db/ (dumps, gitignored)
└── .github/workflows/         CI (runs with working-directory: revamp)
```

Because the git root and the monorepo differ, **CI** uses `working-directory: revamp`
and **Husky** is enabled with `git config core.hooksPath revamp/.husky`.

## Prerequisites

- **Node.js ≥ 20** and **pnpm 9** (`corepack enable`)
- **Docker + Docker Compose** (for Postgres / Redis / MinIO) — or `--no-docker` if you host them yourself

## Quick start

```bash
cd revamp                     # everything runs from the inner monorepo
./scripts/setup.sh            # env files + pnpm install + Docker infra + migrate + demo seed
./scripts/start.sh            # run backend + web (Ctrl-C to stop)
```

Then open the web app and log in:

- **Web:** http://localhost:3001 → redirects to `/id-ID` · login **`admin` / `Password123!`**
- **API / Swagger:** http://localhost:3000/api/docs · health: http://localhost:3000/health

> Ports default to backend **:3000** / web **:3001** (set in `revamp/.env.local`,
> `BE_PORT` / `WEB_PORT`). Change them there if they clash. `setup.sh` is
> idempotent — re-run anytime; `--synthetic` seeds extra trip history,
> `--no-docker` skips starting containers.

Full monorepo docs (manual steps, scripts, partitioning, migration, production
deploy): **[`revamp/README.md`](./revamp/README.md)**. Per-app run/setup:
**[`revamp/apps/backend/README.md`](./revamp/apps/backend/README.md)** ·
**[`revamp/apps/web/README.md`](./revamp/apps/web/README.md)**.

## Environment files (.env)

`setup.sh` copies these from their committed `*.example` templates (all are
gitignored). Edit them for your machine; the **repo-root `revamp/.env.local` is the
single source of truth** for ports/URLs/secrets in dev.

| File | Copied from | Purpose |
| --- | --- | --- |
| `revamp/.env.local` | `revamp/.env.example` | Backend runtime + DB/Redis/S3 URLs, secrets, web API base URL |
| `revamp/apps/web/.env.local` | `revamp/apps/web/.env.example` | Web `NEXT_PUBLIC_API_BASE_URL` (standalone runs; `start.sh` overrides from root) |
| `revamp/apps/backend/prisma/.env` | `revamp/apps/backend/prisma/.env.example` | `DATABASE_URL` for Prisma CLI (migrate/seed/studio) |
| `revamp/infra/docker-compose.env` | `revamp/infra/docker-compose.env.example` | Container defaults + host ports (must match `.env.local`) |
| `revamp/apps/backend/.env.staging` | `…/.env.staging.example` | Staging DB + legacy MySQL creds for `db:seed:staging` (gitignored) |
| `revamp/apps/backend/.env.production` | `…/.env.production.example` | Production cutover creds for `db:seed:production` (gitignored) |

⚠️ Set strong `SESSION_SECRET` / `JWT_SECRET` (and real `POSTGRES_PASSWORD` /
MinIO creds) for any non-local environment.

## Docs & specs

- **[`specs/`](./specs/)** — requirements + [`11-development-plan/`](./specs/11-development-plan/) (phased roadmap, status, verification + check guides).
- **[`docs/`](./docs/)** — `CUTOVER-RUNBOOK.md`, `ROLLBACK-PLAN.md`, `USER-GUIDE.md` (Bahasa), `DEPENDENCY-UPGRADE.md`, `LEGACY-TO-NEW-REFERENCE.md`.
- **[`designs/`](./designs/)** — visual source of truth.

## Conventions

- English in code, Indonesian in the UI. Conventional Commits (commitlint).
- Money = integer rupiah · weights = kg · fuel = `Decimal(8,2)` L · times stored UTC, shown WIB.
