# Phase 0 — Foundation

## Overview

**Goal:** Establish a production-ready TypeScript monorepo with Docker, database, API skeleton, and CI. Developers can run the full stack locally; commits are linted, typed, and tested.

**Duration:** 1–2 weeks.

**Scope:**
- Monorepo structure (pnpm workspaces, Turborepo).
- Tooling: TypeScript (strict), ESLint + Prettier, Husky + lint-staged, commitlint.
- Docker stack: Postgres 15 + Adminer + Redis + MinIO (S3-compatible object storage).
- Database: Prisma init, schema from `03-data-model.md`, first migration, monthly **RANGE partitioning** of `Trip`/`Haul`/`HaulAssignment`/`TpaInboundLog` with denormalized `operationDate` key.
- NestJS bootstrap: app, config, validation, exception filter, API response envelope, Swagger/OpenAPI, health check.
- Next.js bootstrap: App Router, Tailwind, shadcn/ui, next-intl (id-ID), PWA manifest + service worker skeleton.
- Shared packages: TypeScript config, ESLint config, Prisma client, Zod schemas.
- CI pipeline: GitHub Actions — lint, typecheck, unit test, build.
- Object storage wiring, Redis wiring, partitioning scaffolding.

**Dependencies:** None (greenfield).

---

## Execution strategy

**Parallelization:** Epic 0.1 (monorepo & tooling) and 0.2 (backend) and 0.4 (frontend) can start in parallel once the root is scaffolded. Epic 0.3 (database) is a dependency for Phase 1 but can run alongside 0.1/0.2/0.4. Epic 0.5/0.6/0.7 follow once 0.1/0.2/0.4 are well-defined.

**TDD workflow:** Where code is involved (backend endpoints, frontend components), write failing test first (RED), implement (GREEN), refactor (IMPROVE), verify coverage ≥80%.

---

## Tasks by epic

## Epic 0.1 — Monorepo & tooling (parallel-group: core; Size: M)

#### T-001. Init pnpm + Turborepo (Size: S · Coverage: N/A)
- **Depends on:** None
- **Files:**
  - `pnpm-workspace.yaml` (create) — workspace definition
  - `turbo.json` (create) — build cache + task dependencies
  - `package.json` (create) — root dev deps (`pnpm`, `turbo`, `typescript`, `@types/node`)
  - `.npmrc` (create) — pnpm config (public-hoist-pattern for Prisma, etc.)
  - `tsconfig.base.json` (create) — base TypeScript config (strict, noImplicitAny, resolveJsonModule, moduleResolution=bundler)
- **Steps:**
  1. Create root folder structure: `apps/{backend,web}`, `packages/{schemas,types,prisma-client,eslint-config,tsconfig}`, `infra/`, `scripts/`.
  2. Init `package.json` with `pnpm init` and add dev dependencies: `typescript`, `turbo`, `@types/node`, `vitest`, `prettier`, `eslint`.
  3. Create `pnpm-workspace.yaml` with paths to all workspace packages.
  4. Create `turbo.json` with tasks: `lint`, `typecheck`, `test`, `build`, `dev`; caching rules.
  5. Create `tsconfig.base.json` with strict compiler options.
  6. Run `pnpm install`; verify all workspaces resolve.
- **Acceptance criteria:**
  - [ ] `pnpm install` completes without errors.
  - [ ] `pnpm run --filter=. --list` shows registered tasks.
  - [ ] All workspace paths in `pnpm-workspace.yaml` exist.

#### T-002. ESLint + Prettier shared config (Size: S · Coverage: N/A)
- **Depends on:** T-001
- **Files:**
  - `packages/eslint-config/index.js` (create) — ESLint rules (no mutation, no console, no hardcoded secrets, immutability, import sort).
  - `packages/eslint-config/package.json` (create) — exports config.
  - `.eslintrc.cjs` (create, root) — root ESLint config extending shared.
  - `.prettierrc.json` (create, root) — Prettier config (2-space indent, single quotes, trailing commas).
  - `.prettierignore` (create, root) — ignore dist/, build/, node_modules/.
  - `package.json` (modify, root) — add scripts: `lint`, `lint:fix`, `format`, `format:check`.
- **Steps:**
  1. Create `packages/eslint-config/` with `eslint-config-custom` or similar name; define rules for immutability (`no-param-reassign`), no console, no hardcoded secrets.
  2. Create root `.eslintrc.cjs` that extends the shared config and adds project-level overrides.
  3. Create `.prettierrc.json` with standard settings.
  4. Add to root `package.json`: scripts `lint`, `lint:fix`, `format`, `format:check`.
  5. Run `pnpm lint && pnpm format:check` on root (will pass but may have no files yet).
- **Acceptance criteria:**
  - [ ] `pnpm lint` runs without errors (empty repo).
  - [ ] `pnpm format:check` runs without errors.
  - [ ] `packages/eslint-config/index.js` exports a valid ESLint config.

#### T-003. TypeScript strict config (Size: S · Coverage: N/A)
- **Depends on:** T-001
- **Files:**
  - `packages/tsconfig/base.json` (create) — extends root tsconfig.base.json; strict, noImplicitAny, resolveJsonModule, moduleResolution=bundler.
  - `packages/tsconfig/next.json` (create) — Next.js-specific (lib includes DOM, jsx=preserve).
  - `packages/tsconfig/package.json` (create) — exports configs.
- **Steps:**
  1. Create `packages/tsconfig/` directory.
  2. Extend root `tsconfig.base.json` into `packages/tsconfig/base.json` (no changes, reference parent).
  3. Create `packages/tsconfig/next.json` with Next.js-specific settings (includes DOM lib, jsx).
  4. Create `package.json` with `exports` pointing to both configs.
  5. Verify `pnpm typecheck` runs (no errors yet).
- **Acceptance criteria:**
  - [ ] `packages/tsconfig/base.json` and `packages/tsconfig/next.json` exist and are valid JSON.
  - [ ] `pnpm typecheck` command runs without errors.

#### T-004. Husky + lint-staged + commitlint (Size: S · Coverage: N/A)
- **Depends on:** T-002
- **Files:**
  - `.husky/pre-commit` (create) — run lint-staged on staged files.
  - `.husky/commit-msg` (create) — validate conventional commits.
  - `.commitlintrc.cjs` (create) — commitlint config (types: feat, fix, test, chore, docs, refactor, perf, ci).
  - `package.json` (modify, root) — add husky, lint-staged, commitlint as dev deps; add husky install script.
  - `.gitignore` (create/modify) — add .husky/.
- **Steps:**
  1. Install `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`.
  2. Run `pnpm husky install` to init hooks.
  3. Create `.husky/pre-commit` that runs `lint-staged`.
  4. Create `.husky/commit-msg` that runs `commitlint --edit $1`.
  5. Create `.commitlintrc.cjs` with allowed types and scope config.
  6. Add `"lint-staged"` config to `package.json` for `*.{ts,tsx,js,json}` files: `eslint --fix`, `prettier --write`.
- **Acceptance criteria:**
  - [ ] `.husky/` directory exists with both hooks.
  - [ ] `.commitlintrc.cjs` exists and defines allowed commit types.
  - [ ] Manual test: commit a dummy file with message `feat: test` → succeeds; `chore test` (missing colon) → fails.

---

## Epic 0.2 — Backend bootstrap (NestJS) (parallel-group: core; Size: M)

#### T-005. NestJS app scaffold (Size: S · Coverage: N/A)
- **Depends on:** T-001
- **Files:**
  - `apps/backend/package.json` (create) — NestJS + dev deps (jest, supertest, @nestjs/testing, ts-loader, @types/express).
  - `apps/backend/tsconfig.json` (create) — extends shared; sets outDir=dist, rootDir=src.
  - `apps/backend/src/main.ts` (create) — bootstrap function, app.listen(3000).
  - `apps/backend/src/app.module.ts` (create) — root module (imports config, health).
  - `apps/backend/jest.config.js` (create) — Jest config with ts-jest preset.
  - `apps/backend/test/jest-e2e.json` (create) — E2E test config (if needed for Phase 1).
- **Steps:**
  1. Create `apps/backend/` directory structure: `src/{main.ts,app.module.ts,common/,config/,modules/,prisma/,health/}`, `test/`, `dist/`.
  2. Init `package.json` with `@nestjs/common@latest`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`.
  3. Add dev deps: `jest`, `@types/jest`, `ts-jest`, `supertest`, `@nestjs/testing`, `ts-loader`.
  4. Create `tsconfig.json` extending shared base, with `outDir: "dist"`, `rootDir: "src"`, `baseUrl: "src"`.
  5. Create `src/main.ts` with NestFactory.create and app.listen(3000).
  6. Create `src/app.module.ts` (empty for now; will add config, health).
  7. Create `jest.config.js` (standard NestJS preset).
- **Acceptance criteria:**
  - [ ] `apps/backend/src/main.ts` and `app.module.ts` exist and are syntactically valid.
  - [ ] `pnpm --filter=backend build` completes without errors (outputs to `dist/`).
  - [ ] `pnpm --filter=backend dev` starts server on port 3000 (will fail until config/health are added, but check command runs).

#### T-006. Config module & environment (Size: S · Coverage: N/A)
- **Depends on:** T-005
- **Files:**
  - `.env.example` (create, root) — template: `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `LOG_LEVEL`, `REDIS_URL`, `SESSION_SECRET`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
  - `apps/backend/.env.example` (create) — backend-specific overrides (if needed; can defer to root).
  - `apps/backend/src/config/index.ts` (create) — export configService.
  - `apps/backend/src/config/config.module.ts` (create) — ConfigModule with forRoot, loads from .env.
  - `apps/backend/src/config/config.service.ts` (create) — typed getters (getDbUrl(), getLogLevel(), getRedisUrl(), etc.).
  - `apps/backend/src/app.module.ts` (modify) — import ConfigModule.
  - `package.json` (modify, root) — add `dotenv`.
- **Steps:**
  1. Create `.env.example` in repo root with all required keys.
  2. Create `apps/backend/src/config/config.module.ts` using `@nestjs/config` ConfigModule.forRoot(). Load from root `.env` + `.env.local` (gitignored).
  3. Create `config.service.ts` with typed getter methods (validateSync on startup).
  4. Update `app.module.ts` to import ConfigModule first.
  5. Add validation in config.service.ts: throw error if critical vars missing.
  6. Copy `.env.example` to `.env.local` in backend for dev.
- **Acceptance criteria:**
  - [ ] `.env.example` exists with all required keys.
  - [ ] `config.service.ts` exports typed getters; no console.log (use logger).
  - [ ] `pnpm --filter=backend build` passes.
  - [ ] Starting backend without `.env.local` fails with clear error message about missing keys.

#### T-007. API response envelope (Size: S · Coverage: N/A)
- **Depends on:** T-005
- **Files:**
  - `apps/backend/src/common/types/api-response.ts` (create) — interface ApiResponse<T>.
  - `apps/backend/src/common/interceptors/api-response.interceptor.ts` (create) — NestJS interceptor wrapping all responses in ApiResponse envelope.
  - `apps/backend/src/app.module.ts` (modify) — register interceptor globally.
- **Steps:**
  1. Define `ApiResponse<T = void>` interface: `{ success: boolean; data?: T; error?: string; meta?: { total?: number; page?: number; limit?: number } }`.
  2. Create an interceptor that wraps all successful responses in `{ success: true, data: ... }` and errors in `{ success: false, error: ... }`.
  3. Register globally in `AppModule` via `APP_INTERCEPTOR`.
  4. Test manually: any endpoint will now return wrapped response.
- **Acceptance criteria:**
  - [ ] `apps/backend/src/common/types/api-response.ts` exists and exports ApiResponse interface.
  - [ ] Interceptor exists and is registered in AppModule.
  - [ ] `pnpm --filter=backend build` passes.

#### T-008. Global exception filter (Size: S · Coverage: N/A)
- **Depends on:** T-005, T-007
- **Files:**
  - `apps/backend/src/common/filters/http-exception.filter.ts` (create) — catches HttpException, ValidationError, unknown errors.
  - `apps/backend/src/app.module.ts` (modify) — register as global filter via `APP_FILTER`.
- **Steps:**
  1. Implement HttpExceptionFilter that catches HttpException, transforms to ApiResponse format.
  2. Handle validation errors: extract messages, return in ApiResponse.
  3. Log errors (use NestJS logger, no console.log, no PII).
  4. Register globally in AppModule.
- **Acceptance criteria:**
  - [ ] Filter exists at `apps/backend/src/common/filters/http-exception.filter.ts`.
  - [ ] `pnpm --filter=backend build` passes.
  - [ ] Manual test (Phase 1): POST bad data to endpoint → receives ApiResponse with error.

#### T-009. Global validation pipe (Size: S · Coverage: N/A)
- **Depends on:** T-005
- **Files:**
  - `apps/backend/src/common/pipes/validation.pipe.ts` (create) — uses class-validator + class-transformer.
  - `apps/backend/src/app.module.ts` (modify) — register as global pipe via `APP_PIPE`.
  - `package.json` (modify, backend) — add `class-validator`, `class-transformer`.
- **Steps:**
  1. Create ValidationPipe extending NestJS ValidationPipe with custom options: `whitelist: true`, `forbidNonWhitelisted: true`, `transformOptions: { enableImplicitConversion: true }`.
  2. Register globally in AppModule.
  3. Test: POST with extra fields → 400 Bad Request.
- **Acceptance criteria:**
  - [ ] Pipe exists and is registered globally.
  - [ ] `pnpm --filter=backend build` passes.

#### T-010. Swagger / OpenAPI (Size: S · Coverage: N/A)
- **Depends on:** T-005, T-007
- **Files:**
  - `apps/backend/src/main.ts` (modify) — initialize SwaggerModule.
  - `package.json` (modify, backend) — add `@nestjs/swagger`, `swagger-ui-express`.
- **Steps:**
  1. Add `@nestjs/swagger` and `swagger-ui-express` to backend deps.
  2. In `main.ts`, after creating the app, initialize SwaggerModule with `setupTools(app, document)`.
  3. Document title "SWAT API", version from package.json, description.
  4. Use `@ApiOperation`, `@ApiResponse`, `@ApiBody` decorators on endpoints (template for Phase 1 features).
  5. Endpoint: `GET /api/docs` → Swagger UI.
- **Acceptance criteria:**
  - [ ] Swagger UI is accessible at `http://localhost:3000/api/docs`.
  - [ ] OpenAPI JSON available at `http://localhost:3000/api-json`.

#### T-011. Health check endpoint (Size: S · Coverage: N/A)
- **Depends on:** T-005, T-007
- **Files:**
  - `apps/backend/src/health/health.controller.ts` (create) — simple GET /health endpoint.
  - `apps/backend/src/health/health.module.ts` (create) — exports controller.
  - `apps/backend/src/app.module.ts` (modify) — import HealthModule.
- **Steps:**
  1. Create HealthController with `GET /health` endpoint.
  2. Return: `{ success: true, data: { status: "ok" } }`.
  3. No guards or validation needed.
  4. Test: `curl http://localhost:3000/health` → expected response.
- **Acceptance criteria:**
  - [ ] `GET /health` returns `{ "success": true, "data": { "status": "ok" } }`.
  - [ ] Endpoint is not guarded by auth.

---

## Epic 0.3 — Database & Prisma (parallel-group: core; Size: M)

#### T-012. Docker Compose setup (Size: S · Coverage: N/A)
- **Depends on:** T-001
- **Files:**
  - `docker-compose.yml` (create, root) — Postgres 15, Adminer, Redis, MinIO, nginx.
  - `infra/docker-compose.env` (create) — env file for compose (Postgres user/pass, MinIO keys).
  - `infra/Dockerfile.backend` (create) — multi-stage Node.js build for backend (for later; scaffold now).
  - `infra/Dockerfile.web` (create) — multi-stage Node.js build for frontend (for later; scaffold now).
  - `infra/nginx.conf` (create) — reverse proxy config (backend :3000 → /api, frontend :3001 → /, Swagger).
  - `.env.example` (modify) — add `POSTGRES_PASSWORD`, `REDIS_URL`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`.
- **Steps:**
  1. Create `docker-compose.yml` with services: postgres:15, adminer, redis:7, minio, nginx.
  2. Postgres: expose 5432, mount `postgres_data:/var/lib/postgresql/data`, charset UTF-8.
  3. Adminer: expose 8080, auto-connect to Postgres.
  4. Redis: expose 6379, no persistence yet.
  5. MinIO: expose 9000 (API) and 9001 (console), set `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`.
  6. Create `infra/docker-compose.env` with defaults.
  7. Create stub Dockerfiles for backend and web.
  8. Create `infra/nginx.conf` with basic routing.
  9. Update root `.env.example` with Postgres password template.
  10. Test: `docker-compose up -d` → all services start, no errors.
- **Acceptance criteria:**
  - [ ] `docker-compose up -d` starts all services without errors.
  - [ ] Postgres is accessible at `localhost:5432`.
  - [ ] Adminer is accessible at `http://localhost:8080`.
  - [ ] Redis is accessible at `localhost:6379`.
  - [ ] MinIO console is accessible at `http://localhost:9001`.
  - [ ] `docker-compose down` stops all services cleanly.

#### T-013. Prisma init & schema (Size: M · Coverage: N/A)
- **Depends on:** T-005, T-012
- **Files:**
  - `apps/backend/prisma/schema.prisma` (create) — all models, enums, relations from [`03-data-model.md`](../03-data-model.md).
  - `apps/backend/prisma/.env` (create, .gitignore) — `DATABASE_URL` from root .env.
  - `apps/backend/prisma/seed.ts` (create) — placeholder; will populate in T-014.
  - `apps/backend/package.json` (modify) — add `@prisma/client`, `prisma` as dev dep; add `prisma` script in package.json scripts.
- **Steps:**
  1. Install `@prisma/client` and `prisma` in backend.
  2. Create `apps/backend/prisma/` directory.
  3. Copy Prisma schema from [`03-data-model.md`](../03-data-model.md) into `schema.prisma`.
  4. Include all models: User, Role, Permission, Vehicle, Driver, Site, Route, Trip, Haul, HaulAssignment, DisposalPermit, TransactionDay, Photo, TpaInboundLog, etc.
  5. Include all enums: SiteType, RouteCategory, TripStatus, DayStatus, VehicleStatus, FuelCategory, EmploymentStatus, MaintenanceStatus (per [`01-glossary.md`](../01-glossary.md) §4).
  6. Add indexes per data model spec (legacyId, status, dates).
  7. Create `.env` file that references root DATABASE_URL via `.env.local`.
  8. Create stub `seed.ts` file.
  9. Test: `pnpm prisma validate` passes.
- **Acceptance criteria:**
  - [ ] `apps/backend/prisma/schema.prisma` is syntactically valid.
  - [ ] `pnpm --filter=backend prisma validate` passes.
  - [ ] All models and enums from [`03-data-model.md`](../03-data-model.md) are present.

#### T-014. First migration, seed, and partitioning (Size: M · Coverage: N/A)
- **Depends on:** T-013
- **Files:**
  - `apps/backend/prisma/migrations/<timestamp>_init/migration.sql` (create) — auto-generated from schema.
  - `apps/backend/prisma/migrations/<timestamp>_partition_trip/migration.sql` (create) — raw SQL to create RANGE partitions on `Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`.
  - `apps/backend/prisma/seed.ts` (create) — populate enums, reference data, seed users/roles.
  - `package.json` (modify, backend) — add script `prisma:seed`.
- **Steps:**
  1. Ensure Docker stack is up: `docker-compose up -d`.
  2. Set `.env.local` with `DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/swat` (use POSTGRES_PASSWORD from `infra/docker-compose.env`).
  3. Run `pnpm --filter=backend prisma migrate dev --name init` → creates initial schema.
  4. Create a raw SQL migration file for partitioning:
     - Add denormalized `operationDate DATE NOT NULL DEFAULT CURRENT_DATE` to `Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`.
     - Alter tables to partition `RANGE (operationDate)` monthly.
     - Create partitions for 2013–present (e.g., `trip_y2013m01`, `trip_y2013m02`, ..., `trip_y2026m06`).
     - Add unique constraint on `Haul` including `operationDate`: `UNIQUE (operationDate, transactionDayId, vehicleId)`.
  5. Populate `seed.ts` (per [`01-glossary.md`](../01-glossary.md) §2–5 for canonical names):
     - Create roles: Admin (all permissions), Administrasi Data, Checker, Operator Pool, Petugas TPA, Supervisor.
     - Create permissions: user:read, user:create, user:update, user:delete; vehicle:read, vehicle:create, vehicle:update, vehicle:delete; (and similarly for all resources per T-108 of Phase 1).
     - Create the admin user (username: admin, name: Administrator, Argon2id hashed password, `mustChangePassword: false` — admin is **not** force-reset and exists in every environment).
     - Dev/CI seed only (never in production): also create `adminreset` (Argon2id, `mustChangePassword: true`) to exercise the forced first-login password change.
     - Create `LicenseClass`: A, BI, BI Umum, BII, BII Umum, C, D.
     - Create `FuelCategory`: Bersubsidi, Non-Subsidi.
     - Create `Fuel` entries: Premium, Pertamax, Solar, Solar Keekonomian, Pertalite, Dexlite (with placeholder prices).
     - Create `VehicleApplication`: Compactor, Dump Truck, Arm Roll, etc.
     - Create `WasteSource`: D, R, PS, PU, PL, S (per [`01-glossary.md`](../01-glossary.md) §4).
  6. Run `pnpm --filter=backend prisma db seed`.
  7. Test: `SELECT * FROM "User" LIMIT 1;` in Adminer → admin user exists.
  8. Test: `SELECT * FROM "Trip_y2026m06";` (or latest partition) → table exists and is empty.
- **Acceptance criteria:**
  - [ ] Initial migration creates all tables, indexes, constraints.
  - [ ] Partitioning migration executes without errors.
  - [ ] `pnpm --filter=backend prisma db seed` completes successfully.
  - [ ] Admin user exists with Argon2id hash (verify: hash starts with `$argon2id$`).
  - [ ] All lookup tables (Role, Permission, LicenseClass, Fuel, FuelCategory, VehicleApplication, WasteSource) are populated per [`01-glossary.md`](../01-glossary.md).
  - [ ] Monthly partitions exist for Trip, Haul, HaulAssignment, TpaInboundLog (e.g., `trip_y2026m06`).
  - [ ] Partitions have local indexes and are queryable.

---

## Epic 0.4 — Frontend bootstrap (Next.js) (parallel-group: core; Size: M)

#### T-015. Next.js app scaffold (Size: S · Coverage: N/A)
- **Depends on:** T-001
- **Files:**
  - `apps/web/package.json` (create) — Next.js, React, dev deps (vitest, @testing-library/react, @playwright/test).
  - `apps/web/tsconfig.json` (create) — extends shared; App Router config (jsx: preserve).
  - `apps/web/next.config.js` (create) — PWA plugin (next-pwa), image optimization.
  - `apps/web/src/app/layout.tsx` (create) — root shell layout.
  - `apps/web/src/app/page.tsx` (create) — home page stub.
  - `apps/web/.env.example` (create) — `NEXT_PUBLIC_API_BASE_URL`.
- **Steps:**
  1. Create `apps/web/` directory structure: `src/app/`, `src/components/`, `src/lib/`, `src/i18n/`, `public/`.
  2. Init `package.json` with `next@latest`, `react@latest`, `react-dom@latest`.
  3. Add dev deps: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest`, `@testing-library/react`, `@playwright/test`.
  4. Create `tsconfig.json` extending shared, with `jsx: "preserve"`, `App Router` settings.
  5. Create `next.config.js` with PWA plugin config (defer PWA details to T-018).
  6. Create `src/app/layout.tsx` (root shell, will add nav/header in later tasks).
  7. Create `src/app/page.tsx` (home stub: welcome banner).
  8. Create `.env.example` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`.
- **Acceptance criteria:**
  - [ ] `apps/web/src/app/layout.tsx` and `page.tsx` exist and are syntactically valid.
  - [ ] `pnpm --filter=web build` completes without errors.
  - [ ] `pnpm --filter=web dev` starts on port 3001 (default Next.js dev port).
  - [ ] `http://localhost:3001` loads and displays home page stub.

#### T-016. Tailwind + shadcn/ui + SWAT design tokens (Size: M · Coverage: N/A)
- **Depends on:** T-015
- **Design source of truth:** [`13-design/01-design-system.md`](../13-design/01-design-system.md)
  and `designs/design_handoff_swat_webapp/swat-tokens.css` (**port verbatim**).
- **Files:**
  - `apps/web/tailwind.config.ts` (create) — **the exact config from `01-design-system.md` §5.1**
    (`darkMode:['class']`; primary emerald ramp `#ecfdf5…#022c22`; neutral/success/warning/danger/info;
    shadcn HSL aliases; fontFamily sans=Plus Jakarta Sans, mono=JetBrains Mono; fontSize h1…tiny;
    spacing xs…3xl; borderRadius; boxShadow subtle/sm/base/lg; zIndex ladder; screens sm…2xl).
  - `apps/web/postcss.config.js` (create).
  - `apps/web/src/app/globals.css` (create) — **port `swat-tokens.css` verbatim**: `:root` token vars
    + the **`.dark { … }`** block + `:focus-visible` ring + shadcn HSL `:root`/`.dark`. Add `@tailwind`
    directives. Optionally inline the reference utilities from `swat-components.css` (`.mono`,`.tnum`,
    responsive `.tcards`/`.bottom-nav`/`.action-bar`/`.app-banner`).
  - `apps/web/src/app/layout.tsx` (modify) — load **Plus Jakarta Sans + JetBrains Mono** (next/font or
    self-host); add the **pre-paint theme script** in `<head>` (reads `localStorage('swat-theme')`,
    sets `.dark` before paint) and `<meta name="theme-color" content="#0f172a">`.
  - `apps/web/src/lib/theme.ts` (create) — theme controller: get/set/toggle, persist to
    `localStorage('swat-theme')`, sync `prefers-color-scheme` + `<meta theme-color>`.
  - `apps/web/src/lib/cn.ts` (create) — `clsx` + `tailwind-merge` helper.
  - `apps/web/components.json` (create) — shadcn/ui config (alias `@/components`).
  - `apps/web/package.json` (modify) — `tailwindcss`,`postcss`,`autoprefixer`,
    `class-variance-authority`,`clsx`,`tailwind-merge`,`lucide-react`,`next-themes`(optional).
  - `apps/web/src/app/(dev)/tokens/page.tsx` (create) — a **token smoke screen** rendering swatches,
    the type scale, shadows, and a few primitives, with a light/dark toggle (dev-only; remove or gate later).
- **Steps:**
  1. Install Tailwind + shadcn deps + lucide-react.
  2. Drop in `tailwind.config.ts` and `globals.css` **exactly** from the design system / `swat-tokens.css`.
  3. Wire the fonts + pre-paint theme script + `lib/theme.ts`.
  4. `components.json` with alias `@/components`; init shadcn.
  5. Build the token smoke screen and verify swatches/type/shadows in **light and `.dark`**.
- **Acceptance criteria:**
  - [ ] `globals.css` token values are **byte-identical** to `swat-tokens.css` (`:root` + `.dark`).
  - [ ] Emerald ramp, primary-700 fills, focus-ring, and z-index ladder match `01-design-system.md`.
  - [ ] Toggling `.dark` flips the smoke screen correctly with no flash on reload.
  - [ ] Plus Jakarta Sans + JetBrains Mono load; `tabular-nums` available.
  - [ ] `pnpm --filter=web build` passes; `grep` finds no stale `#f0fdf4`.

#### T-016a. Brand & spot-illustration assets (Size: S · Coverage: N/A)
- **Depends on:** T-016
- **Files:**
  - `apps/web/public/brand/` (create) — copy `swat-mark.svg`, `swat-mark-dark.svg`, `swat-mark-mono.svg`
    from `designs/design_handoff_swat_webapp/assets/`.
  - `apps/web/public/illustrations/` (create) — copy all 11 SVGs from `assets/illustrations/`.
  - `apps/web/src/components/illustrations/Illustration.tsx` (create) — `<Illustration name size/>`,
    `aria-hidden`, dark-mode filter; resolves from `/illustrations/`.
  - `apps/web/src/components/illustrations/Icon.tsx` (create) — thin wrapper over `lucide-react`
    (name→component map per `01-design-system.md` §Assets).
- **Acceptance:** illustrations + brand marks render; decorative (`aria-hidden`); dark filter applied.

#### T-016b. id-ID formatters + status→pill map (Size: S · Coverage: ≥90%)
- **Depends on:** T-016
- **Rationale:** used by every screen — build early with unit tests.
- **Files:**
  - `apps/web/src/lib/format.ts` (create) — `formatRupiah`, `formatDateForm`(`dd/MM/yyyy`),
    `formatDateDisplay`(`d MMM yyyy`, id), `formatTime`(`HH:mm:ss`), `formatWeight`(kg),
    `formatDistance`(km), `formatFuel`(`L`, 2dp), `formatTonnage`(ton) — id-ID separators, WIB.
  - `apps/web/src/lib/status-pill.ts` (create) — enum→{label, badgeVariant} map mirroring
    `01-design-system.md` §1.4 (Trip/Day/DisposalPermit/Vehicle/Maintenance/Inspection/Employment/License/
    Refuel/Report/User).
  - `apps/web/src/lib/__tests__/format.test.ts` (create) — unit tests for every formatter + pill mapping.
- **Acceptance:** ≥90% coverage; examples match the design system table (`Rp 8.500.000`, `15 Mar 2026`,
  `45,50 L`, etc.); every status enum resolves to the correct label + variant.

#### T-017. next-intl (Indonesian) setup (Size: S · Coverage: N/A)
- **Depends on:** T-015
- **Files:**
  - `apps/web/src/i18n/config.ts` (create) — i18n configuration (locales, defaultLocale, namespaces).
  - `apps/web/src/i18n/middleware.ts` (create) — or `src/middleware.ts` — locale detection middleware.
  - `apps/web/src/messages/id-ID.json` (create) — Indonesian UI labels (common, navigation, forms).
  - `apps/web/next.config.js` (modify) — add next-intl config.
  - `apps/web/package.json` (modify) — add `next-intl`.
- **Steps:**
  1. Install `next-intl`.
  2. Create `src/i18n/config.ts`: configure locales (id-ID, en-US), default locale (id-ID).
  3. Create `src/middleware.ts` for locale routing: detect from URL, default to id-ID.
  4. Create `src/messages/id-ID.json` with sample labels: `common.home`, `common.logout`, `nav.fleet`, `nav.personnel`, `nav.transactions`, etc.
  5. Create `src/i18n/use-translations.ts` (or similar) hook for accessing messages.
  6. Update layout/page to use translations.
  7. Test: navigate to `/en-US/` → should work; default to `/id-ID/`.
- **Acceptance criteria:**
  - [ ] `src/messages/id-ID.json` exists and contains at least 20 sample messages.
  - [ ] Locale routing works: `/id-ID/` loads Indonesian, `/en-US/` (if supported) loads English.
  - [ ] Layout/home page uses translation keys.

#### T-018. PWA manifest & service worker skeleton (Size: S · Coverage: N/A)
- **Depends on:** T-015
- **Files:**
  - `apps/web/public/manifest.json` (create) — PWA manifest.
  - `apps/web/public/service-worker.ts` (create) — service worker skeleton (full offline support in Phase 5).
  - `apps/web/src/app/layout.tsx` (modify) — link to manifest in <head>.
  - `apps/web/next.config.js` (modify) — next-pwa plugin config (if not done in T-016).
- **Steps:**
  1. Create `public/manifest.json` with: name (SWAT), short_name, description, start_url (/id-ID/), display (standalone), theme_color, background_color, icons (placeholder icon), categories (productivity).
  2. Create `public/service-worker.ts` stub (empty for now; Phase 5 adds offline sync).
  3. Add <link rel="manifest"> in layout.tsx.
  4. Configure next-pwa plugin in `next.config.js` with automatic service worker injection.
  5. Test: manifest is served at `/manifest.json`; browser detects PWA capability.
- **Acceptance criteria:**
  - [ ] `public/manifest.json` is valid and contains required PWA fields.
  - [ ] `http://localhost:3001/manifest.json` is accessible.
  - [ ] Layout includes manifest link.

#### T-019. API client wrapper (Size: S · Coverage: N/A)
- **Depends on:** T-015, T-017
- **Files:**
  - `apps/web/src/lib/api-client.ts` (create) — fetch wrapper returning `ApiResponse<T>`.
  - `apps/web/src/lib/api-error.ts` (create) — custom error class for API errors.
  - `apps/web/src/hooks/useApi.ts` (create) — optional; hook wrapping api-client for components.
- **Steps:**
  1. Create `api-client.ts` that exports an `apiClient` object with methods: `get<T>`, `post<T>`, `put<T>`, `delete<T>`.
  2. Each method: takes URL and optional body, injects `Authorization` header (from cookie), sets `Content-Type: application/json`, handles response envelope (unwraps `data` field).
  3. On error: log (no PII), throw `ApiError` with status and message.
  4. Return raw `data` from `ApiResponse<T>.data` so calling code doesn't see envelope.
  5. Create `api-error.ts` with custom error class.
  6. Optional: create `useApi.ts` hook that wraps api-client for React components (loading state, error state).
  7. Test: manually call an endpoint in a component (Phase 1 will have real tests).
- **Acceptance criteria:**
  - [ ] `src/lib/api-client.ts` exports `apiClient` with typed methods.
  - [ ] API calls inject `Authorization` header from cookies.
  - [ ] Responses are unwrapped (caller sees `T`, not `ApiResponse<T>`).
  - [ ] Errors throw `ApiError` with useful message.

---

## Epic 0.5 — Shared packages (parallel-group: follow-on; Size: S)

#### T-020. @swat/schemas (Zod schemas) (Size: M · Coverage: ≥80%)
- **Depends on:** T-001
- **Files:**
  - `packages/schemas/src/index.ts` (create) — main export.
  - `packages/schemas/src/user.schema.ts` (create) — login, user CRUD schemas.
  - `packages/schemas/src/vehicle.schema.ts` (create) — vehicle CRUD schemas.
  - `packages/schemas/src/driver.schema.ts` (create) — driver CRUD schemas.
  - `packages/schemas/src/site.schema.ts` (create) — site CRUD schemas.
  - `packages/schemas/src/route.schema.ts` (create) — route CRUD schemas.
  - `packages/schemas/src/common.schema.ts` (create) — pagination, common types.
  - `packages/schemas/package.json` (create) — exports.
  - `packages/schemas/src/__tests__/user.schema.spec.ts` (create) — sample unit tests.
  - `packages/schemas/tsconfig.json` (create) — extends shared.
- **Steps:**
  1. Create `packages/schemas/` directory and `package.json` with `zod` as dependency.
  2. Create Zod schemas for common patterns:
     - `PaginationSchema` (limit, page, sort).
     - `LoginSchema` (username: string, password: string, min 6 chars).
     - `UserCreateSchema` (username, name, roleId).
     - `VehicleCreateSchema` (plateNumber, modelId, poolSiteId, status, currentOdometer, currentTareWeight).
     - `DriverCreateSchema` (name, idCardNumber, poolSiteId, employmentStatus, birthDate, contact).
     - `SiteCreateSchema` (type, name, address, latitude, longitude).
     - `RouteCreateSchema` (originSiteId, destinationSiteId, category, distanceKm).
  3. Keep schemas minimal; business logic enforced on backend.
  4. Each schema includes error messages in Indonesian.
  5. Write unit tests for 2–3 schemas: valid inputs pass, invalid inputs fail with expected error messages.
  6. Export all from `index.ts`.
- **Acceptance criteria:**
  - [ ] `packages/schemas/src/` contains at least 6 schema files.
  - [ ] Each schema validates correctly (manual test: `zod.parse(goodData)` succeeds, `zod.parse(badData)` throws).
  - [ ] `pnpm --filter=schemas test` runs unit tests with ≥80% coverage.
  - [ ] `pnpm lint && pnpm typecheck` pass.

#### T-021. @swat/prisma-client (Prisma client export) (Size: S · Coverage: N/A)
- **Depends on:** T-013
- **Files:**
  - `packages/prisma-client/src/index.ts` (create) — export singleton PrismaClient.
  - `packages/prisma-client/package.json` (create) — depends on `@prisma/client`.
  - `packages/prisma-client/tsconfig.json` (create) — extends shared.
- **Steps:**
  1. Create `packages/prisma-client/src/index.ts` that imports and re-exports `PrismaClient` from `@prisma/client`.
  2. Create a singleton factory if needed (defer to Phase 1 if not needed yet).
  3. Update backend and web to import from `@swat/prisma-client` instead of `@prisma/client` directly (optional refactor in Phase 1).
- **Acceptance criteria:**
  - [ ] Package exports PrismaClient.
  - [ ] `pnpm --filter=prisma-client build` passes.

---

## Epic 0.6 — CI/CD pipeline (sequential; Size: S)

#### T-022. GitHub Actions CI workflow (Size: S · Coverage: N/A)
- **Depends on:** T-001, T-002, T-003, T-005, T-015
- **Files:**
  - `.github/workflows/ci.yml` (create) — main CI pipeline.
- **Steps:**
  1. Create workflow file with trigger: `push` to main + `pull_request`.
  2. Node matrix: `[20]` (or current LTS).
  3. Steps:
     - Checkout code.
     - Setup Node.js + pnpm.
     - `pnpm install`.
     - `pnpm lint` (all apps).
     - `pnpm typecheck` (backend + frontend).
     - `pnpm test` (unit tests).
     - `pnpm build` (backend + frontend).
  4. Set `fail-fast: false` to see all failures.
  5. Require CI to pass before merge (GitHub repo settings).
- **Acceptance criteria:**
  - [ ] `.github/workflows/ci.yml` exists and is valid YAML.
  - [ ] CI runs on a test PR: all steps pass.
  - [ ] CI fails if `pnpm lint` has errors.
  - [ ] CI fails if `pnpm build` fails.

#### T-023. .env.example and documentation (Size: S · Coverage: N/A)
- **Depends on:** T-006, T-012, T-015
- **Files:**
  - `.env.example` (modify, root) — complete template with all keys from all services.
  - `README.md` (create, root) — setup guide, running locally, Docker, tests, linting.
- **Steps:**
  1. Update root `.env.example` to include all keys from backend, frontend, and Docker services:
     - `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `JWT_SECRET`, `LOG_LEVEL`.
     - `NEXT_PUBLIC_API_BASE_URL`.
     - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
     - `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (for Docker).
  2. Create/update `README.md` with:
     - Clone + `pnpm install`.
     - Copy `.env.example` to `.env.local` and set values.
     - `docker-compose up -d`.
     - `pnpm dev` (starts both backend + frontend).
     - Running tests, linting, building.
     - Database migrations.
     - Architecture overview (link to specs).
- **Acceptance criteria:**
  - [ ] `.env.example` contains all required keys with comments.
  - [ ] `README.md` provides clear setup instructions.
  - [ ] A new developer can follow README to get stack running locally.

---

## Epic 0.7 — Storage, cache & partitioning foundations (sequential; Size: M)

#### T-024. Object storage wiring (MinIO/S3) (Size: M · Coverage: ≥80%)
- **Depends on:** T-012, T-006, T-005
- **Files:**
  - `apps/backend/src/modules/storage/storage.module.ts` (create) — NestJS module.
  - `apps/backend/src/modules/storage/storage.service.ts` (create) — S3 client wrapper (AWS SDK v3).
  - `apps/backend/src/modules/storage/storage.controller.ts` (create) — endpoints for presigned URLs.
  - `apps/backend/src/modules/storage/dto/presigned-url.dto.ts` (create) — request/response DTOs.
  - `apps/backend/src/modules/storage/__tests__/storage.service.spec.ts` (create) — unit tests.
  - `apps/backend/package.json` (modify) — add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.
- **Steps:**
  1. Create StorageModule (NestJS feature module).
  2. Create StorageService that wraps AWS SDK S3 client:
     - Initialize S3Client with MinIO endpoint (from config).
     - Methods: `getPresignedPutUrl(key, expiresIn)`, `getPresignedGetUrl(key, expiresIn)`, `uploadObject(key, body)`, `deleteObject(key)`.
     - Handle errors gracefully (no PII in logs).
  3. Create StorageController with endpoints:
     - `POST /storage/presigned-put` → `{ presignedUrl, expiresIn }` for frontend to PUT file.
     - `POST /storage/presigned-get { key }` → presigned GET URL.
     - (DELETE endpoint deferred to Phase 1 if needed.)
  4. Create buckets (via migration or Docker setup): `swat-photos`, `swat-thumbnails`, `swat-reports`.
  5. Write unit tests: mock S3 client, test presigned URL generation, test error handling.
- **Acceptance criteria:**
  - [ ] StorageService generates valid presigned URLs.
  - [ ] `POST /storage/presigned-put` returns a valid MinIO presigned URL.
  - [ ] Unit tests pass with ≥80% coverage on StorageService.
  - [ ] MinIO buckets exist and are readable via presigned URLs (manual test).

#### T-025. Redis wiring (cache + session) (Size: S · Coverage: ≥80%)
- **Depends on:** T-012, T-006, T-005
- **Files:**
  - `apps/backend/src/modules/cache/cache.module.ts` (create) — NestJS module.
  - `apps/backend/src/modules/cache/cache.service.ts` (create) — Redis wrapper (ioredis).
  - `apps/backend/src/modules/cache/__tests__/cache.service.spec.ts` (create) — unit tests.
  - `apps/backend/package.json` (modify) — add `ioredis`.
- **Steps:**
  1. Create CacheModule with Redis connection (lazy-loaded, graceful if down).
  2. Create CacheService with methods:
     - `get<T>(key: string): Promise<T | null>`.
     - `set(key: string, value: any, ttl?: number): Promise<void>`.
     - `del(key: string): Promise<void>`.
     - `invalidatePattern(pattern: string): Promise<number>` (for cache busting on writes).
  3. On error (Redis down), return null from get, silently fail on set (no crash).
  4. Use structured key naming: `cache:reference:fuel:*`, `cache:ref:license:*`, etc.
  5. Write unit tests: mock ioredis, test get/set/del/pattern-invalidate.
  6. Session store: Phase 1 will use Redis for session storage (set up connection URL in config).
  7. Rate limiter: stub (Phase 2 implements actual rate limiting).
- **Acceptance criteria:**
  - [ ] CacheService provides typed get/set/del methods.
  - [ ] Graceful degradation if Redis is down (logged warning, continues).
  - [ ] Unit tests pass with ≥80% coverage.
  - [ ] `pnpm lint && pnpm typecheck` pass.

#### T-026. Partitioning scaffolding & rollup tables (Size: M · Coverage: N/A)
- **Depends on:** T-014
- **Files:**
  - `apps/backend/prisma/migrations/<timestamp>_rollups/migration.sql` (create) — raw SQL for rollup tables.
  - `apps/backend/src/modules/analytics/rollup.service.ts` (create) — service to populate rollups (stub for Phase 2).
  - `apps/backend/prisma/seed.ts` (modify) — add synthetic data for a year of trips to test partitioning.
- **Steps:**
  1. Verify partitioning migration from T-014 is applied (monthly partitions exist).
  2. Create raw SQL migration to add rollup tables (from `12-scalability-archiving.md` §4):
     - `DailyTonnage` (date, totalNetWeight).
     - `MonthlyTonnageBySource` (month, wasteSourceId, totalNetWeight).
     - `MonthlyTonnageBySite` (month, siteId, totalNetWeight).
     - `DailyFuelByVehicle` (date, vehicleId, totalFuelLiters).
     - `MonthlyRouteActivity` (month, routeId, tripCount).
     - Add indexes: (date), (month, wasteSourceId), etc.
  3. Create `RollupService` (stub) with methods for incremental updates (Phase 2 implements).
  4. Update `seed.ts` to insert a year of synthetic data (2025-06 to 2026-06):
     - 365 TransactionDay entries.
     - For each day: 10–20 random Trip rows with DISPOSAL status, random netWeight, operationDate = day.
     - Verify: `EXPLAIN ANALYZE SELECT * FROM Trip WHERE operationDate = '2026-06-05'` shows partition pruning (only queries `trip_y2026m06` partition).
  5. Test: after seed, query performance on historical data (before partitioning, would scan all; with partitioning, scans one month only).
- **Acceptance criteria:**
  - [ ] Rollup tables exist in schema.
  - [ ] Synthetic data is seeded (365+ days, 3650+ trips).
  - [ ] `EXPLAIN ANALYZE` on a trip query shows partition pruning (Filter applied before Scan).
  - [ ] `pnpm --filter=backend prisma db seed` completes with synthetic data.

---

## Parallelization groups

**Phase 0 can be executed with the following parallel groups:**

1. **Group 1 (core, start immediately):** T-001, T-002, T-003, T-004 (monorepo & tooling)
2. **Group 2A (after Group 1, parallel):** T-005–T-011 (backend bootstrap)
3. **Group 2B (after Group 1, parallel):** T-015–T-019 (frontend bootstrap)
4. **Group 3 (after Groups 2A & 1):** T-012 (Docker) + T-013, T-014 (Prisma/database)
5. **Group 4 (after Group 2):** T-020, T-021 (shared packages)
6. **Group 5 (after Groups 3 & 4):** T-022, T-023 (CI/CD)
7. **Group 6 (after Group 3 & 2A):** T-024, T-025, T-026 (storage/cache/partitioning)

**Recommended assignment:**
- **Backend Lead:** T-005–T-014, T-024–T-026.
- **Frontend Lead:** T-015–T-019.
- **DevOps Lead:** T-001–T-004, T-012, T-022, T-023.
- **Full-stack:** T-020, T-021 (shared packages).

---

## Exit Criteria (Phase 0)

- [ ] `docker-compose up -d` starts Postgres + Adminer + Redis + MinIO, all healthy.
- [ ] `pnpm install && pnpm build` succeeds locally and in GitHub Actions CI.
- [ ] `pnpm dev` starts NestJS backend on `:3000` and Next.js frontend on `:3001` in parallel.
- [ ] `GET http://localhost:3000/health` returns `{ "success": true, "data": { "status": "ok" } }`.
- [ ] `GET http://localhost:3000/api/docs` (Swagger UI) loads and displays API skeleton.
- [ ] Database: initial migration creates all tables, indexes, constraints without errors.
- [ ] Partitioning migration creates monthly partitions for `Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog` (e.g., `trip_y2026m06`).
- [ ] `pnpm --filter=backend prisma db seed` populates roles, permissions, users, lookup data, and synthetic data without errors.
- [ ] Admin user exists with an **Argon2id** hash (verify: starts with `$argon2id$`) and `mustChangePassword: false` (admin is not force-reset).
- [ ] Dev/CI only: `adminreset` user exists with `mustChangePassword: true` to exercise the forced first-login change (never seeded in production).
- [ ] Rollup tables exist (empty, ready for Phase 2).
- [ ] `pnpm lint` and `pnpm typecheck` pass with 0 errors, 0 warnings across all packages.
- [ ] `pnpm test` runs unit tests for at least 3 packages (backend modules, shared schemas); baseline coverage established (no minimum coverage for Phase 0, but foundation for Phase 1 ≥80%).
- [ ] GitHub Actions CI: all checks green on a test PR (lint, typecheck, test, build).
- [ ] MinIO buckets (`swat-photos`, `swat-thumbnails`, `swat-reports`) exist and are accessible via presigned URLs.
- [ ] Redis connection works and cache operations (get/set/del) are functional.
- [ ] Partition pruning confirmed: `EXPLAIN ANALYZE` on a date-filtered trip query shows single-partition scan.

---

## Task Summary (T-001 … T-026)

| Task ID | Epic | Title | Size |
|---------|------|-------|------|
| T-001 | 0.1 | Init pnpm + Turborepo | S |
| T-002 | 0.1 | ESLint + Prettier shared config | S |
| T-003 | 0.1 | TypeScript strict config | S |
| T-004 | 0.1 | Husky + lint-staged + commitlint | S |
| T-005 | 0.2 | NestJS app scaffold | S |
| T-006 | 0.2 | Config module & environment | S |
| T-007 | 0.2 | API response envelope | S |
| T-008 | 0.2 | Global exception filter | S |
| T-009 | 0.2 | Global validation pipe | S |
| T-010 | 0.2 | Swagger / OpenAPI | S |
| T-011 | 0.2 | Health check endpoint | S |
| T-012 | 0.3 | Docker Compose setup | S |
| T-013 | 0.3 | Prisma init & schema | M |
| T-014 | 0.3 | First migration, seed, and partitioning | M |
| T-015 | 0.4 | Next.js app scaffold | S |
| T-016 | 0.4 | Tailwind + shadcn/ui + SWAT design tokens (port `swat-tokens.css` verbatim, light + dark) | M |
| T-016a | 0.4 | Brand & spot-illustration assets | S |
| T-016b | 0.4 | id-ID formatters + status→pill map (≥90% cov) | S |
| T-017 | 0.4 | next-intl (Indonesian) setup | S |
| T-018 | 0.4 | PWA manifest & service worker skeleton | S |
| T-019 | 0.4 | API client wrapper | S |
| T-020 | 0.5 | @swat/schemas (Zod schemas) | M |
| T-021 | 0.5 | @swat/prisma-client (Prisma client export) | S |
| T-022 | 0.6 | GitHub Actions CI workflow | S |
| T-023 | 0.6 | .env.example and documentation | S |
| T-024 | 0.7 | Object storage wiring (MinIO/S3) | M |
| T-025 | 0.7 | Redis wiring (cache + session) | S |
| T-026 | 0.7 | Partitioning scaffolding & rollup tables | M |

**Total tasks:** 26 | **Est. effort:** 1–2 weeks

---

## Milestone

**End of Phase 0 — Foundation in place.** A developer can clone the repo, `docker-compose up -d && pnpm install && pnpm dev`, and see both services running with health check and Swagger API docs responding. Schema is definitive; migrations are idempotent. Database is partitioned and seeded. Object storage, Redis, and CI are wired and tested. Ready for Phase 1 feature development.
