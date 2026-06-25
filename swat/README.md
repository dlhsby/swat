# SWAT — Sistem Pengangkutan Sampah Terpadu

Fleet & solid-waste-transport operations platform for **DLH Kota Surabaya**.
A TypeScript monorepo rebuilding the legacy CodeIgniter app (`../old_swat`) on a
modern stack. **Phases 0–5 are code-complete under green gates:** 0 foundation ·
1 auth/RBAC + master data + transactions + migration toolkit · 2 monitoring &
analytics · 3 reporting/exports · 4 weighbridge (TPA) integration · 5 transaction
revamp (ad-hoc trips, native REST parity, trip photos, TPA backfill). Next:
6 monitoring/reporting review · 7 production deploy + migration · 8 field/mobile.
The phased plan + status ledgers live in
[`../specs/11-development-plan/`](../specs/11-development-plan/) (`README.md` is the
roadmap index). Live infra steps (Docker stack, `migrate deploy`, the multi-TB
transactional migration, cutover) are the operator's on-prem steps.

## Stack

| Layer           | Tech                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Monorepo        | pnpm workspaces + Turborepo                                                                       |
| Backend         | NestJS · Prisma · PostgreSQL 15 (monthly range-partitioned)                                       |
| Frontend        | Next.js (App Router) · Tailwind + shadcn tokens · next-intl (id-ID) · PWA                         |
| Auth            | Argon2id · session cookies (web) + OAuth2 bearer tokens (native clients) + API keys (weighbridge) |
| Storage / Cache | MinIO (S3) · Redis                                                                                |
| Validation      | Zod (`@swat/schemas`, shared) + class-validator                                                   |
| Tooling         | TypeScript strict · ESLint · Prettier · Husky · commitlint · Vitest/Jest                          |

## Layout

```
swat/
├── apps/
│   ├── backend/        # NestJS API (+ Prisma schema, migrations, seed)
│   └── web/            # Next.js PWA
├── packages/
│   ├── schemas/        # @swat/schemas — shared Zod schemas
│   ├── prisma-client/  # @swat/prisma-client — PrismaClient singleton
│   ├── eslint-config/  # @swat/eslint-config
│   └── tsconfig/       # @swat/tsconfig
├── infra/              # Dockerfiles, nginx, compose env (+ .example)
├── scripts/            # setup.sh (bootstrap) · start.sh (run)
└── docker-compose.yml  # Postgres · Adminer · Redis · MinIO · nginx
```

## Prerequisites

- Node.js ≥ 20, **pnpm 9** (`corepack enable`)
- Docker + Docker Compose (for Postgres/Redis/MinIO)

## Quick start (scripts)

Two helper scripts in [`scripts/`](./scripts/) wrap the whole flow:

```bash
# 1. One-time setup: env files + install + Docker infra + migrate + seed
./scripts/setup.sh              # add --synthetic to also seed ~365 days of trips

# 2. Run the stack (ensures infra is up, then backend + web)
./scripts/start.sh
#   Backend  http://localhost:3000  (GET /health · Swagger /api/docs)
#   Frontend http://localhost:3001  (redirects to /id-ID)
#   Admin login → admin / Password123!  (ready to use; `adminreset` exercises forced reset)
```

`setup.sh` is idempotent — re-run it anytime. Flags: `--synthetic` (seed synthetic dataset),
`--no-docker` (infra already running). `start.sh --infra` brings up only the containers;
`start.sh --no-docker` runs just the apps.

### Manual steps (what the scripts do)

```bash
# 1. Configure env (copy templates → gitignored local files)
cp .env.example .env.local
cp apps/backend/prisma/.env.example apps/backend/prisma/.env
cp infra/docker-compose.env.example infra/docker-compose.env

# 2. Install (runs `prisma generate` via postinstall)
pnpm install

# 3. Start infrastructure
docker compose --env-file infra/docker-compose.env up -d
#   Postgres :5432 · Adminer :8080 · Redis :6379 · MinIO :9000 (console :9001) · nginx :8088
#   The minio-init job creates buckets: swat-photos, swat-thumbnails, swat-reports

# 4. Apply migrations, then seed. Seeding has FOUR independent, idempotent tracks:
pnpm db:migrate
pnpm db:seed                    # = db:seed:demo — synthetic dev data + a year of trips + auto rollup backfill
#   pnpm db:seed:legacy         # real legacy masters from MySQL (no transactions); needs LEGACY_DB_* env
#   pnpm db:seed:staging        # legacy + transactional history → staging DB (SEED_ENV=staging / infra/env/backend/.env.staging)
#   pnpm db:seed:production      # the real cutover → production DB (infra/env/backend/.env.production; needs --confirm-production)

# 5. Run both apps
pnpm dev
```

### Custom infra ports

Host ports are configurable in `infra/docker-compose.env` (copied from
`infra/docker-compose.env.example`). Override any that clash on your machine:

```ini
POSTGRES_PORT=5432      # ADMINER_PORT=8080      REDIS_PORT=6379
MINIO_API_PORT=9000     MINIO_CONSOLE_PORT=9001  NGINX_PORT=8088
```

If you change `POSTGRES_PORT`, `REDIS_PORT`, or `MINIO_API_PORT`, update the matching URL in
`.env.local` (`DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`) and `apps/backend/prisma/.env`.

## Scripts (root)

| Command                                                | Description                                       |
| ------------------------------------------------------ | ------------------------------------------------- |
| `pnpm dev`                                             | Run backend + web in watch mode                   |
| `pnpm build`                                           | Build all workspaces (Turborepo)                  |
| `pnpm lint` / `pnpm typecheck`                         | Lint / type-check all                             |
| `pnpm test`                                            | Unit tests (Vitest + Jest)                        |
| `pnpm format` / `pnpm format:check`                    | Prettier write / check                            |
| `pnpm db:generate`                                     | `prisma generate`                                 |
| `pnpm db:migrate`                                      | `prisma migrate deploy`                           |
| `pnpm db:seed` / `db:seed:demo`                        | Seed synthetic demo data + rollups (default)      |
| `pnpm db:seed:legacy`                                  | Load real legacy masters (no demo, no txns)       |
| `pnpm db:seed:staging`                                 | Legacy + transactional history → staging DB       |
| `pnpm db:seed:production`                              | Production cutover (needs `--confirm-production`) |
| `pnpm db:seed:auth`                                    | Auth bootstrap only (admin)                       |
| `pnpm --filter @swat/backend run migrate:backfill-tpa` | Link migrated TPA logs → trips (Phase 5)          |

## Production deployment

A fully-containerised stack (single public origin behind Nginx) lives in
[`infra/`](./infra/):

```bash
cp infra/docker-compose.prod.env.example infra/docker-compose.prod.env   # set REAL secrets
docker compose -f infra/docker-compose.prod.yml --env-file infra/docker-compose.prod.env up -d --build
#   Postgres · Redis · MinIO · backend (multi-stage) · web (Next standalone) · Nginx :80
#   backend runs `prisma migrate deploy` on boot; seed the admin once (runbook).
```

Nginx (`infra/nginx.prod.conf`) serves one origin: `/api`, `/health`, `/api/docs`
→ backend; everything else → web. Same-origin makes the httpOnly `swat.sid` session
cookie first-party, enabling a true server-side route guard. Front it with TLS.

## Migration (legacy MySQL → PostgreSQL)

Scripts in [`apps/backend/scripts/migration/`](./apps/backend/scripts/migration/)
(`migrate:discovery` · `migrate:legacy` · `migrate:images` · `migrate:verify` ·
`migrate:delta-sync`). Pure transform/mapper logic is unit-tested; the end-to-end
run against the live DB + image filesystem is the operator's on-prem step.

`migrate:legacy` (= `pnpm db:seed:legacy`) is **self-sufficient and demo-free**: it
bootstraps the permission catalog + a full-access `admin / Password123!`, loads the
real legacy users (each `Password123!` with a forced first-login reset; legacy MD5 is
never copied) and their permissions derived from the legacy menu tree, plus master +
aggregate data. Run it on a clean DB (`prisma migrate reset --force --skip-seed`), not
on top of `db:seed:demo`. The **transactional bulk load** (haritransaksi→TransactionDay,
transaksiangkutsampah→Haul, detail→HaulAssignment, trayek→Trip, sampahmasuktpa→
TpaInboundLog) is implemented and runs via `db:seed:staging`/`db:seed:production`
(`--include-transactions`, keyset-batched + watermarked). After a legacy load, link the
migrated TPA logs to their trips with `migrate:backfill-tpa` (Phase 5). See that folder's
README for the per-track detail.

## Cutover & operations docs

In [`../docs/`](../docs/): [`CUTOVER-RUNBOOK.md`](../docs/CUTOVER-RUNBOOK.md),
[`ROLLBACK-PLAN.md`](../docs/ROLLBACK-PLAN.md), [`USER-GUIDE.md`](../docs/USER-GUIDE.md)
(Bahasa, role-based), [`LEGACY-TO-NEW-REFERENCE.md`](../docs/LEGACY-TO-NEW-REFERENCE.md),
[`KNOWN-ISSUES-AND-WORKAROUNDS.md`](../docs/KNOWN-ISSUES-AND-WORKAROUNDS.md).

## API docs

With the backend running, Swagger UI is at `http://localhost:3000/api/docs` — every
endpoint is decorated (`@ApiTags`/`@ApiOperation`) and wrapped in the `ApiResponse<T>`
envelope.

## Database & partitioning

`Trip`, `Haul`, `HaulAssignment`, and `TpaInboundLog` are converted to native
**monthly RANGE partitions** by a raw-SQL migration
(`prisma/migrations/*_partition_transactions`) that runs after the Prisma init
migration. Partition keys are the denormalized `operationDate`; PKs become
`(operationDate, id)` and cross-partition FKs include the key. Because Prisma
doesn't model partitions, treat these four tables as **migration-managed** (use
`prisma migrate deploy`, not `migrate dev`, after initial setup). Rollup tables
(`*_rollups` migration) back monitoring and are never archived.

Verify partition pruning:

```sql
EXPLAIN ANALYZE SELECT * FROM "Trip" WHERE "operationDate" = '2026-06-05';
-- expect a scan of a single partition (e.g. trip_y2026m06)
```

## CI

`.github/workflows/ci.yml` (at the git-repo root) runs install → prisma generate
→ lint → typecheck → test → build on push/PR to `main`.

## Docs & status

- [`../specs/`](../specs/) — authoritative requirements (specs + phased dev plan).
- [`../specs/11-development-plan/phase-0-status.md`](../specs/11-development-plan/phase-0-status.md) —
  Phase 0 task ledger, exit-criteria evidence, and documented deviations.

## Conventions

- **English in code, Indonesian in the UI** (`../specs/01-glossary.md`).
- Conventional Commits (enforced by commitlint): `feat`, `fix`, `refactor`, …
- Money = integer rupiah; weights = kg; fuel = `Decimal(8,2)` L; times stored UTC, shown WIB.
