# @swat/backend — SWAT API

NestJS (Express 5) + Prisma 7 + PostgreSQL 15 REST API for SWAT. Part of the
[`swat/`](../../README.md) monorepo — prefer the root **`./scripts/setup.sh`** /
**`./scripts/start.sh`** for the full stack. This README covers running the backend
on its own.

## Prerequisites

- Node ≥ 20 · pnpm 9 (`corepack enable`) — install deps once from the repo root: `pnpm install`
- Postgres + Redis + MinIO reachable (the monorepo's `docker compose --env-file infra/docker-compose.env up -d` starts them)

## Environment (.env)

The backend reads runtime config from the **repo-root `swat/.env.local`** (loaded by
`@nestjs/config`), while the **Prisma CLI** (migrate/seed/studio) reads
`apps/backend/prisma/.env`. Copy both from their templates:

```bash
# from the repo root (swat/)
cp .env.example .env.local                                   # runtime: BE_PORT, DATABASE_URL, secrets, S3/Redis
cp apps/backend/prisma/.env.example apps/backend/prisma/.env # DATABASE_URL for Prisma CLI (keep in sync)
```

Key vars (see `.env.example` for all): `BE_PORT` (default 3000), `DATABASE_URL`,
`REDIS_URL`, `S3_*`, `SESSION_SECRET`, `JWT_SECRET`, optional `CORS_ORIGIN`.

For the legacy/staging/production seed tracks, also create the gitignored env files
with the legacy MySQL + target DB creds:

```bash
cp apps/backend/.env.staging.example    apps/backend/.env.staging
cp apps/backend/.env.production.example  apps/backend/.env.production
```

## Setup the database

```bash
pnpm db:generate            # prisma generate (also runs on postinstall)
pnpm db:migrate             # prisma migrate deploy  (NEVER migrate dev — partitioned tables are managed)
pnpm db:seed                # demo data (synthetic dev data + a year of trips + rollup backfill)
```

Seed tracks (all idempotent, scope with `--filter @swat/backend`):

| Command                         | What                                                                      |
| ------------------------------- | ------------------------------------------------------------------------- |
| `pnpm db:seed` / `db:seed:demo` | Synthetic dev/demo data + auto rollup backfill (no MySQL needed)          |
| `pnpm db:seed:legacy`           | Real legacy **masters** from MySQL (no transactions); needs `LEGACY_DB_*` |
| `pnpm db:seed:staging`          | Legacy + **transactional history** → staging DB (`SEED_ENV=staging`)      |
| `pnpm db:seed:production`       | Production cutover (`.env.production`, needs `--confirm-production`)      |
| `pnpm db:seed:auth`             | Permissions + roles + admin only                                          |

After a legacy load, link migrated TPA logs to trips:
`pnpm --filter @swat/backend run migrate:backfill-tpa`.

> Clean reset (local): `pnpm exec prisma migrate reset --force --skip-seed`, then the seed track you want.

## Run

```bash
# from the repo root, with env loaded (start.sh does this for you):
pnpm --filter @swat/backend dev          # watch mode on $BE_PORT (default :3000)
```

> **Hot reload:** `dev` compiles with **SWC** (`swc --watch`) and restarts via **nodemon** —
> sub-second restarts on save, far faster/more reliable than tsc-watch on WSL. nodemon also
> watches the shared packages' `dist` (`@swat/schemas`, `@swat/prisma-client`), so editing shared
> code restarts the API too (their `dev` scripts rebuild on change; `turbo run dev` runs them).
> SWC skips type-checking for speed — run `pnpm typecheck` separately. Production `pnpm build`
> still uses `nest build` (tsc), so type errors can't slip into a release build. A `schema.prisma`
> change still needs `pnpm db:generate` + a restart.

- Health: `GET http://localhost:3000/health` · Swagger UI: `http://localhost:3000/api/docs`
- All routes are under the `api/v1` prefix; responses use the `ApiResponse<T>` envelope.
- Default login: `admin / Password123!`.

## Test

```bash
pnpm --filter @swat/backend test         # Jest unit (services, mappers, guards)
pnpm --filter @swat/backend test:e2e     # Supertest e2e against the live Docker stack
pnpm --filter @swat/backend typecheck    # tsc --noEmit
pnpm --filter @swat/backend lint
```

## Layout

```
apps/backend/
├── prisma/            schema.prisma · migrations/ · seed.ts · demo fixtures · prisma.config.ts
├── src/
│   ├── modules/       <domain>/{controller,service,repository,dto,module}.ts (+ *.spec.ts)
│   ├── common/        auth, interceptors, pagination, prisma adapter, dates …
│   └── config/        env validation (Zod), app config
├── scripts/migration/ migrate-legacy · migrate-images · verify-migration · backfill-tpa-trip-links …
├── test/              *.e2e-spec.ts (jest-e2e.json)
└── postman/           generated collection (kept 1:1 with Swagger) + generate.mjs
```

## Notes

- **Partitioned tables** (`Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`) are migration-managed
  monthly RANGE partitions — always `migrate deploy`, never `migrate dev`.
- **Prisma 7** uses driver adapters (`@prisma/adapter-pg`); `DATABASE_URL` lives in `prisma.config.ts`
  for the CLI and `.env.local` for runtime — keep them consistent.
- Migration scripts run via `ts-node` and load env from `prisma/.env`/`.env.local` (or `.env.<SEED_ENV>`).
