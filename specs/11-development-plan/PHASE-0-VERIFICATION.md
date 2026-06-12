# SWAT Phase 0 — Manual Verification Checklist

Step-by-step acceptance pass for Phase 0 (Foundation). Work top-to-bottom; each item has
**Steps** and an **Expected** result. Check the box when it passes. Items are tagged **[OPS]**
(docker/shell/psql), **[API]** (curl/Swagger), **[WEB]** (browser), or **[DEV]** (workstation
tooling — runs in the dev WSL without Docker).

- **API base:** `http://localhost:3000` · **Health:** `/health` · **Swagger:** `/api/docs` · **OpenAPI JSON:** `/api-json`
  > The default port is **3000**; this dev box remaps it to **4020** (`PORT`/`NEXT_PUBLIC_API_BASE_URL` in `.env.local`)
  > to avoid a collision. Substitute your actual port below.
- **Web base:** `http://localhost:3001/` (redirects to `/id-ID`).
- **psql:** the DB user is `swat` (not `postgres`); **all tables/columns are snake_case** via Prisma `@@map`/`@map`
  (model `Trip` → table `trip`, field `operationDate` → column `operation_date`). Quote only when needed.
- **Monorepo lives in the inner `swat/` dir** — run all `pnpm` commands from there.
- Phase 0 is *scaffold-all, defer-live-infra*: **[DEV]** items run in the dev WSL today; **[OPS]/[API]/[WEB]**
  items need the Docker stack and are the operator's to confirm once Docker is enabled. (The build-side
  record in [`phase-0-status.md`](./phase-0-status.md) already verified the live items on 2026-06-08.)

---

## P · Prerequisites — bring the toolchain & stack up

- [ ] **P1. Install [DEV].** From inner `swat/`: `pnpm install` → completes with no errors; all workspaces resolve.
- [ ] **P2. Env file [OPS].** `cp .env.example .env.local` and fill values. **Expected:** `.env.example`
  carries every key (DATABASE_URL, REDIS_URL, SESSION_SECRET, JWT_SECRET, LOG_LEVEL,
  NEXT_PUBLIC_API_BASE_URL, S3_*, POSTGRES_PASSWORD, MINIO_ROOT_USER/PASSWORD) with comments.
- [ ] **P3. Docker up [OPS].** `docker compose --env-file infra/docker-compose.env up -d` →
  postgres15 / adminer / redis7 / minio / nginx all start. **Expected:** `docker compose ps` shows
  postgres + redis healthy; Adminer `:8080`, MinIO console `:9001` reachable.
- [ ] **P4. Hooks wired [DEV].** `git config core.hooksPath` → `swat/.husky` (the git root is the **outer**
  dir; hooks are cwd-robust). pre-commit + commit-msg both present.

---

## T · Tooling & monorepo  [DEV]

- [ ] **T1. Workspaces.** `pnpm-workspace.yaml` lists `apps/{backend,web}` + `packages/{schemas,prisma-client,eslint-config,tsconfig}`; every listed path exists. `turbo.json` defines `lint`/`typecheck`/`test`/`build`/`dev`.
- [ ] **T2. Lint.** `pnpm lint` → **0 errors, 0 warnings** across all packages. Shared `@swat/eslint-config` enforces no-param-reassign, no-console, import/order.
- [ ] **T3. Typecheck.** `pnpm typecheck` → 0 errors across all packages (TypeScript strict via `@swat/tsconfig`).
- [ ] **T4. Build.** `pnpm build` → backend emits `dist/`, web emits `.next/`; all packages build.
- [ ] **T5. Format.** `pnpm format:check` → passes (Prettier: 2-space, single quotes, trailing commas).
- [ ] **T6. Commit-lint guard.** Commit a dummy with `feat: test` → **succeeds**; `chore test` (no colon) → **rejected** by `commit-msg`. Allowed types: feat/fix/test/chore/docs/refactor/perf/ci.
- [ ] **T7. lint-staged.** Stage a `.ts` file with a lint error and commit → pre-commit **blocks** until fixed (eslint runs on `*.{ts,tsx}`; configs go to Prettier only).

---

## B · Backend skeleton (NestJS)  [API unless noted]

- [ ] **B1. Boots [OPS].** `pnpm dev` (or `pnpm --filter @swat/backend dev`) → backend listens on `:3000`, no missing-module errors at boot.
- [ ] **B2. Health (unguarded).** `curl -s http://localhost:3000/health` → `{"success":true,"data":{"status":"ok"}}`; no auth required; **not** under the `api/v1` prefix.
- [ ] **B3. Swagger UI.** Open `http://localhost:3000/api/docs` → UI renders, titled "SWAT API". `GET /api-json` returns the OpenAPI document.
- [ ] **B4. Global prefix.** API routes live under `/api/v1/*`; `health` is excluded from the prefix.
- [ ] **B5. Response envelope.** Any successful endpoint returns `{ success: true, data: … }`; the global `ApiResponseInterceptor` wraps every response.
- [ ] **B6. Exception filter.** Trigger an error → response is the `{ success: false, error: … }` envelope (no stack trace / SQL / file paths leaked); logged via the Nest logger, no `console.log`.
- [ ] **B7. Validation pipe.** POST a body with an unknown extra field to any DTO-backed route → **400** (`whitelist` + `forbidNonWhitelisted`; implicit type conversion on).
- [ ] **B8. Config fail-loud [OPS].** Start the backend with a required env var missing → it **fails at startup with a clear message** (Zod `env.validation.ts`), not a silent boot.

---

## F · Frontend skeleton (Next.js)  [WEB unless noted]

- [ ] **F1. Boots [OPS].** `pnpm dev` serves the web app on `:3001`; `http://localhost:3001/` loads.
- [ ] **F2. Default locale.** Visiting `/` redirects to **`/id-ID`** (localeDetection off — `Accept-Language` can't force en-US); `/en-US` also resolves.
- [ ] **F3. Design tokens.** Open the dev token smoke screen (`/(dev)/tokens` → `/id-ID/tokens`). **Expected:** emerald primary ramp, type scale (h1…tiny), shadows, primitives render. `grep` finds no stale `#f0fdf4`.
- [ ] **F4. Dark mode, no flash.** Toggle theme on the smoke screen and hard-reload. **Expected:** `.dark` flips every surface; **no flash** on reload (pre-paint script in `<head>` reads `localStorage['swat-theme']`).
- [ ] **F5. Fonts.** Plus Jakarta Sans (sans) + JetBrains Mono (mono) load; `tabular-nums` available.
- [ ] **F6. i18n.** `messages/id-ID.json` + `en-US.json` present (≥20 keys); layout/pages render from translation keys, not hardcoded strings.
- [ ] **F7. Brand & illustrations.** `public/brand/` (3 marks) + `public/illustrations/` (11 SVGs) served; `<Illustration>` renders decoratively (`aria-hidden`) with a dark-mode filter.
- [ ] **F8. PWA manifest.** `http://localhost:3001/manifest.json` is valid (name SWAT, start_url `/id-ID/`, standalone, theme/background color, icons); layout links the manifest; service-worker skeleton registers.
- [ ] **F9. API client.** `lib/api-client.ts` exposes typed `get/post/put/delete`, injects the auth cookie, and **unwraps** the envelope (callers see `T`, not `ApiResponse<T>`); errors throw `ApiError`.

---

## S · Shared packages  [DEV]

- [ ] **S1. @swat/schemas.** `pnpm --filter @swat/schemas test` → green, ≥80% coverage. Schemas (common/user/vehicle/driver/site/route) parse good input and reject bad input with **Indonesian** messages.
- [ ] **S2. Formatters (≥90%).** `format.ts` tests pass: `formatRupiah` → `Rp 8.500.000`, `formatDateDisplay` → `15 Mar 2026`, `formatFuel` → `45,50 L`, etc. (id-ID separators, WIB).
- [ ] **S3. Status→pill map.** Every status enum (Trip/Day/DisposalPermit/Vehicle/Maintenance/Inspection/Employment/License/Refuel/User) resolves to the correct `{label, badgeVariant}` per the design system.
- [ ] **S4. @swat/prisma-client.** `pnpm --filter @swat/prisma-client build` passes; package exports a `PrismaClient` singleton + re-exports `@prisma/client`.

---

## DB · Database, migrations & partitioning  [OPS]

- [ ] **DB1. Schema valid [DEV].** `pnpm --filter @swat/backend prisma validate` passes; all models + enums from [`../03-data-model.md`](../03-data-model.md) present. All PKs UUID v7; tables/columns snake_case via `@@map`/`@map`; `legacyId` indexed.
- [ ] **DB2. Migrate (deploy, never dev).** `pnpm --filter @swat/backend prisma:deploy` applies the 3 ordered migrations: `init` → `partition_transactions` → `rollups`. **Expected:** `_prisma_migrations` lists all three. *(`migrate dev` would try to reset to the unpartitioned shape — do not run it.)*
- [ ] **DB3. Monthly partitions exist.** `trip`, `haul`, `haul_assignment`, `tpa_inbound_log` are native RANGE partitions on `operation_date` with monthly children 2013→present (e.g. `trip_y2026m06`) + a default. Children carry local indexes and are queryable.
  `docker compose exec postgres psql -U swat -d swat -c "\dt trip_y2026m06"` → one row.
  (Child count: `SELECT count(*) FROM pg_inherits i JOIN pg_class p ON p.oid=i.inhparent WHERE p.relname='trip';` → 169.)
- [ ] **DB4. Partition pruning.** `EXPLAIN SELECT * FROM trip WHERE operation_date='2026-06-05';` → scans **only `trip_y2026m06`**, not the parent / all partitions.
- [ ] **DB5. Rollup tables.** `\dt daily_tonnage monthly_tonnage_by_source monthly_tonnage_by_site daily_fuel_by_vehicle monthly_route_activity` → all listed.
- [ ] **DB6. Seed (auth + lookups).** `pnpm --filter @swat/backend prisma:seed` → `admin` user (`password_hash` begins `$argon2id$`, `must_change_password=false`), **dev-only `adminreset`** (`must_change_password=true`) + one demo user per non-admin role, roles, full permission set (96), lookups (license_class, fuel, fuel_category, vehicle_type, waste_source `D/R/PS/PU/PL/S`).
- [ ] **DB7. Synthetic seed (gated).** `SEED_SYNTHETIC=1 pnpm --filter @swat/backend prisma:seed` → ~365 TransactionDays + thousands of DISPOSAL trips spread across `operationDate` so partition pruning is observable. Idempotent.

---

## I · Infra wiring — storage & cache  [OPS / API]

- [ ] **I1. MinIO presigned round-trip.** `POST /api/v1/storage/presigned-put` → PUT bytes to the URL → `POST /storage/presigned-get` → GET returns the **same bytes**. Buckets `swat-photos` / `swat-thumbnails` / `swat-reports` exist.
- [ ] **I2. Storage error handling [DEV].** `pnpm --filter @swat/backend test` storage suite green (≥80%, mocked S3); failures return clean errors, no PII in logs.
- [ ] **I3. Redis live.** `docker compose exec redis redis-cli PING` → `PONG`. CacheService get/set/del/invalidatePattern work.
- [ ] **I4. Cache graceful degradation [DEV].** Cache unit tests green (≥80%); with Redis down, `get` returns null and `set` fails silently (logged warning, no crash).

---

## CI · Continuous integration  [OPS]

- [ ] **CI1. Workflow valid.** `.github/workflows/ci.yml` is valid YAML; runs on `push` to `main` + `pull_request`; Node 24, pnpm via `pnpm/action-setup` (working-directory `swat`).
- [ ] **CI2. Green run.** Push a branch / open a PR → CI runs **Lint · Typecheck · Test · Build** and goes green.
- [ ] **CI3. Fails loudly.** Introduce a lint error or a build break on a throwaway branch → CI **fails** on that step (confirms the gate actually blocks).

---

## E2E · Playwright smoke (operator / live stack)  [WEB]

The suite (`apps/web/e2e/`: auth, master-data, transactions) runs against a **running** same-origin
stack via the Nginx origin (`PLAYWRIGHT_BASE_URL`, default `http://localhost:8088`), so the httpOnly
session cookie flows exactly as in production. It is **not** part of the unit gates.

- [ ] **E2E0. Stack reachable.** Web on `WEB_PORT` (3001) and backend on `BE_PORT` (3000) are up and
  Nginx proxies to them. If the backend is remapped (e.g. `BE_PORT=4020`), set `BACKEND_PORT=4020` in
  `infra/docker-compose.env` and recreate nginx so the proxy follows — see the port note in `P`.
- [ ] **E2E1. Run.** `pnpm --filter @swat/web exec playwright install chromium` then
  `PLAYWRIGHT_BASE_URL=http://localhost:8088 pnpm --filter @swat/web test:e2e`.
  In **dev** mode first-hit route compilation is slow; warm the routes or run `--workers=1` (CI uses
  `retries: 2`). **Expected:** auth (bad-cred message, login→dashboard, unauth route guard), master-data
  (vehicle inline validation, driver + SIM sheet), and transactions (Haul Board nav, DISPOSAL
  negative-net-weight gate) all pass.

---

## DOC · Docs & developer onboarding  [DEV]

- [ ] **DOC1. README.** `swat/README.md` walks clone → `.env.local` → `docker compose up` → `pnpm install` → `prisma:deploy` → seed → `pnpm dev`. A fresh developer can follow it to a running stack.
- [ ] **DOC2. .env.example complete.** Every key any service reads is present and commented; no secret values committed.

---

## Definition of done

- **T + B + F + S + DB(validate) green in the dev WSL** → the scaffold is provably sound without Docker
  (lint/typecheck/test/build/prisma-validate).
- **P + DB(deploy/seed/prune) + I + CI + WEB/API smoke green** → the live foundation is verified
  (operator, Docker-dependent). Already evidenced 2026-06-08 in [`phase-0-status.md`](./phase-0-status.md).
- All 26 tasks (T-001…T-026) delivered; documented deviations (Argon2id over bcrypt, raw-SQL
  partitioning via `migrate deploy`, inner-`swat/` monorepo root, `incremental:false`,
  `import/no-unresolved` off, `packages/types` deferred) are intentional — see `phase-0-status.md`.

> Automated coverage at Phase-0 close: **42 unit tests** (backend 14, schemas 17, web 11);
> `format.ts`/`status-pill.ts` ≥90%, `@swat/schemas` ≈95%, storage/cache ≥80%. No minimum-coverage
> gate for Phase 0 itself — it establishes the ≥80% foundation Phase 1 builds on.
