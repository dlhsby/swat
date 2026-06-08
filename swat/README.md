# SWAT — Sistem Pengangkutan Sampah Terpadu

Fleet & solid-waste-transport operations platform for **DLH Kota Surabaya**.
A TypeScript monorepo rebuilding the legacy CodeIgniter app (`../old_swat`) on a
modern stack. **Phase 0 (foundation) is complete** — see the status report at
`../specs/11-development-plan/phase-0-status.md` (spec: `../specs/11-development-plan/phase-0.md`).

## Stack

| Layer           | Tech                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| Monorepo        | pnpm workspaces + Turborepo                                               |
| Backend         | NestJS · Prisma · PostgreSQL 15 (monthly range-partitioned)               |
| Frontend        | Next.js (App Router) · Tailwind + shadcn tokens · next-intl (id-ID) · PWA |
| Auth            | Argon2id · session cookies (Phase 1)                                      |
| Storage / Cache | MinIO (S3) · Redis                                                        |
| Validation      | Zod (`@swat/schemas`, shared) + class-validator                           |
| Tooling         | TypeScript strict · ESLint · Prettier · Husky · commitlint · Vitest/Jest  |

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
#   Admin login → admin / ChangeMe!2026  (mustChangePassword)
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

# 4. Apply migrations + seed (partitions, RBAC, admin, lookup [+ synthetic] data)
pnpm db:migrate
pnpm db:seed                    # SEED_SYNTHETIC=1 pnpm db:seed  for synthetic trips

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

| Command                             | Description                      |
| ----------------------------------- | -------------------------------- |
| `pnpm dev`                          | Run backend + web in watch mode  |
| `pnpm build`                        | Build all workspaces (Turborepo) |
| `pnpm lint` / `pnpm typecheck`      | Lint / type-check all            |
| `pnpm test`                         | Unit tests (Vitest + Jest)       |
| `pnpm format` / `pnpm format:check` | Prettier write / check           |
| `pnpm db:generate`                  | `prisma generate`                |
| `pnpm db:migrate`                   | `prisma migrate deploy`          |
| `pnpm db:seed`                      | Seed reference + synthetic data  |

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
