# SWAT — Project Guide

Concise orientation so sessions don't re-explore. Global directives live in `~/.claude/CLAUDE.md`.

## Layout

- **Monorepo lives in the inner `revamp/` dir** (`projects/swat/revamp/`), NOT the project root.
  Run all package-manager commands from there. (Historically this dir was named `swat/`; renamed to
  `revamp/` 2026-06.)
- **Git repo root is the outer `projects/swat/`** → `.github/workflows/` sits at the outer root
  (CI uses `working-directory: revamp`). Husky: enable with `git config core.hooksPath revamp/.husky`.
- Project root also holds `specs/`, `designs/`, `prompts/`, and `legacy/` — the archived legacy system:
  the old CodeIgniter app under `legacy/web/` (formerly `old_swat/`, tracked) plus DB dumps under
  `legacy/db/` (dumps/binaries gitignored — see `legacy/db/.gitignore`).

## Stack

pnpm + Turborepo · NestJS 11 (Express 5) + Prisma 7 + Postgres 15 · Next 16 + React 19 +
Tailwind 4 + next-intl 4 · Zod 4 · ESLint 9 (flat config) · Vitest 4 / Jest 30 · TypeScript 5.9.
(All deps on latest majors as of 2026-06; `pnpm audit` = 0. See `docs/DEPENDENCY-UPGRADE.md`.)
Packages: `@swat/{schemas,prisma-client,eslint-config,tsconfig}`; backend = `@swat/backend`.
Admin seed login: `admin / Password123!` (no forced reset). Dev/CI seed also creates
`adminreset / Password123!` (`mustChangePassword=true`) to exercise the forced first-login
change, plus one ready-to-use demo user per non-admin role for RBAC testing —
`administrasi`, `checker`, `operator`, `petugastpa`, `supervisor` (all `/ Password123!`).
None of these dev/CI accounts are created in production.

## Frontend conventions (`apps/web`)

- **Routes use English slugs** under `[locale]` (e.g. `/id-ID/dashboard`, `/vehicles`,
  `/scheduling`, `/record`, `/monitoring/fuel`); **UI labels stay localized** via next-intl. IA lives in
  `src/lib/nav.ts`. Note the frontend `/scheduling` route (UI label "Penjadwalan") is served by the
  unchanged backend API path `/transaction-days` — the FE slug and BE path intentionally differ.
- **Code/DB keep English domain terms (`Haul`, `Levy`, `Trip`); user-facing display reconciles to the
  operators' vocabulary** — `Haul` → **"Pengangkutan Sampah"**, `Levy` → "Retribusi", `Trip` →
  **"Perjalanan"** (the legacy `trayek`; never "leg"/"trip" in id-ID — that confuses operators). Don't
  surface the raw English entity name in id-ID UI strings (en-US may keep "Haul"/"Trip" — valid
  English). The nav/monitoring **section** label stays the shorter "Pengangkutan" (it spans kru/
  kendaraan/rute/peta, not just hauls); only the Haul **entity** count/label is "Pengangkutan Sampah".
- **Default locale `id-ID`**, enforced with `localeDetection: false` in `src/i18n/routing.ts` so the
  browser `Accept-Language` can't redirect `/` to en-US.
- **Form error handling (standard):** field-specific errors render **inline under the field**
  (react-hook-form `FormMessage`, or a `text-tiny text-danger-600` line for lightweight controlled
  forms like the auth pages); **submit-level success/failure go to a toast** (`notify.success` /
  `notify.error`). CRUD dialogs already do this — server 422 `err.details` map onto fields via
  `form.setError`, while the manager toasts the overall result. Don't use an inline `<Alert>` for
  submit errors; reserve `Alert` for persistent informational notices (e.g. the forced
  password-change warning).
- **Design tokens** ship as CSS variables in `src/app/globals.css` (light + `.dark`), ported verbatim
  from `designs/`. `tailwind.config.ts` color ramps reference those vars (`var(--neutral-0)` …) so
  `.dark` flips every `bg-/text-*` utility. Opacity can't be applied to a hex `var()` — overlays use
  the dedicated `--scrim` token (`bg-scrim`), not `bg-neutral-900/50`.
- **Tailwind 4 (CSS-first toolchain, legacy JS config kept):** `globals.css` starts with
  `@import "tailwindcss";` + `@config "../../tailwind.config.ts";` so the design-token JS config above
  is preserved unchanged. PostCSS uses `@tailwindcss/postcss` (autoprefixer is bundled — don't re-add
  it). `cn()` still uses `extendTailwindMerge` (tailwind-merge 3); keep the `fontSize` group in sync.
- **Theme**: default follows system (`prefers-color-scheme`); user choice persists in
  `localStorage['swat-theme']` and is applied pre-paint. Controller: `src/lib/theme.ts`. The
  in-app **Settings** page (`/settings`, avatar menu) switches appearance (System/Light/Dark) +
  language (id-ID/en-US, via `router.replace(pathname, {locale})`).
- **`cn()` must know the custom font sizes** (`src/lib/cn.ts` uses `extendTailwindMerge` to register
  `text-{h1,h2,h3,body-lg,body,body-sm,label,tiny}` as `font-size`). Without it, tailwind-merge
  mistakes a named `text-body*` for a text _color_ and **strips a real color** like `text-white`
  that precedes it — buttons render green-bg with inherited dark text. Keep this list in sync when
  adding a `fontSize` token; a `cn` regression test guards it.
- **Selected/active contrast (dark mode):** the `.dark` primary ramp is non-monotonic (only
  `primary-50..300` invert; `400..900` unchanged). So emphatic selections use a mode-stable fill
  `bg-primary-700 text-white` (literal white, NOT `text-neutral-0` which flips); subtle tints
  (`bg-primary-50 text-primary-700`) need `dark:text-primary-400` or they're dark-on-dark.
- **`designs/` is the visual source of truth** (Claude Design handoff bundle); on conflict the bundle
  wins — see `designs/INDEX.md`.

## Package manager: pnpm (NOT npm)

From inner `revamp/`:

- Build: `pnpm build` · Dev: `pnpm dev` · Lint: `pnpm lint` (`pnpm lint:fix`) · Types: `pnpm typecheck`
- Test: `pnpm test` · Format: `pnpm format` / `pnpm format:check`
- DB: `pnpm db:generate` · `pnpm db:migrate` (= prisma **deploy**) · `pnpm db:seed`
- Seeding is **four** independent, idempotent tracks (all from inner `revamp/`, scope with
  `--filter @swat/backend`):
  - **`seed:demo`** (= `db:seed`, default) — dev/demo data: demo users + per-role permissions + a
    **slim curated master subset** (`prisma/demo-fixtures.ts`, ~15 vehicles/22 sites/39 routes, derived
    from the legacy snapshot by `scripts/build-demo-fixtures.ts`) + a **sampled slice of REAL legacy
    transactions** (latest year, demo vehicles — `prisma/demo-transactions.json`, loaded first) with
    **synthetic** transactions filling the remaining days (the synthetic pass skips days that already
    have hauls, so no double-count) + 24 months of levies + inspections/maintenance/photos. **Auto-runs
    the rollup backfill** at the end. No MySQL at seed time. After a re-dump, regenerate all demo
    fixtures with `infra/refresh-demo-fixtures.sh`.
  - **`seed:legacy`** — full legacy load from MySQL via `migrate:legacy`: master + auth + scheduling +
    aggregates, **no transactions, no synthetic data**. For local pre-UAT testing on real masters.
  - **`seed:staging`** (root `pnpm seed:staging` → `infra/seed-legacy-from-dump.sh staging
    --with-transactions`) — stands up a throwaway MySQL from `legacy/db/dump/`, then the engine loads
    master + **full transactional history** (`--include-transactions`: haritransaksi→TransactionDay,
    transaksiangkutsampah→Haul, detail→HaulAssignment, trayek→Trip, sampahmasuktpa→TpaInboundLog —
    **every stage keyset-batched + watermarked with per-batch FK resolution**, so ~21M rows load at flat
    memory). Targets the staging DB via `SEED_ENV=staging`. For UAT.
  - **`seed:production`** (root `pnpm seed:production`) — same from `.env.production` with
    `SEED_ENV=production` + requires `--confirm-production` (the engine AND the script refuse without it).
    The real cutover.
  - `seed:auth` (`SEED_AUTH_ONLY=true`) stays as an internal bootstrap utility (permissions + roles +
    admin only). Legacy users get `LEGACY_SEED_PASSWORD` (default `Password123!`) with a forced
    first-login reset; a legacy username colliding with `admin` is suffixed. Legacy tracks need
    `DATABASE_URL` + `LEGACY_DB_*` (legacy MySQL `dkp_swat` on host `:13306`, user `AdminDKP`) — for
    staging/production the **target `DATABASE_URL` is decrypted from the encrypted
    `infra/env/backend/.env.staging`** (no separate seed env file) and `LEGACY_DB_*` come from the
    legacy source (the dump helper's throwaway MySQL). For a clean legacy-only reseed use `infra/seed-legacy-from-dump.sh`
    (self-cleaning) — **not** `prisma migrate reset`: Prisma 7 has no `--skip-seed`, and `DROP SCHEMA`
    overflows the partitioned tables' `max_locks_per_transaction`.
- Scope one package: `pnpm --filter @swat/backend run <script>`

### Env files (named by purpose — no collisions)

- **Dev/local**: root `.env.local` (backend + shared, also fed to web by `scripts/start.sh`) ←
  `.env.example`; `apps/web/.env.local` ← `apps/web/.env.example` (standalone web); `apps/backend/prisma/.env`
  (Prisma CLI) ← `prisma/.env.example`.
- **Deploy/runtime + staging seed (encrypted)**: `infra/env/{backend,web}/.env.staging` — dotenvx
  ciphertext, committed; key in SSM/GitHub. The runtime decrypts it at boot; the legacy seed
  (`SEED_ENV=staging`) decrypts `DATABASE_URL` from the same file (so there's ONE `.env.staging`).
  `LEGACY_DB_*` (the legacy MySQL source) come from the env — the dump helper sets them.
- **Production (on-prem, encrypted)**: `infra/env/backend/.env.production` — same dotenvx pattern
  (`DOTENV_PRIVATE_KEY_PRODUCTION` in the gitignored `.env.keys`, stored in the client's secret store,
  NOT AWS). `seed:production` decrypts `DATABASE_URL` from it. Template: `.env.production.example`
  (on-prem MinIO + local Postgres placeholders — fill before cutover).
- **Infra stack**: `infra/docker-compose*.env` ← `*.example`.

## Gotchas

- **Schema foundations:** All tables and columns use snake_case via Prisma `@@map`/`@map`; model names are
  PascalCase, field names are camelCase. All primary keys are **UUID v7** (`String @id @db.Uuid @default(uuid(7))`).
  `legacyId` (Int/BigInt, indexed, unique) is the numeric bridge for legacy data migration.
- **Renamed entity:** `FuelQuota` → `DisposalPermit` (it is a TPA dumping permit, NOT fuel; buyer/payment deferred).
  Enum: `FuelQuotaStatus` → `DisposalPermitStatus`. Permissions: `fuel-quota:*` → `disposal-permit:*`.
  Routes: `/scheduling/fuel-quotas` → `/scheduling/disposal-permits`. UI label stays "Jatah Kitir".
- **Partitioned tables** (`Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`) are converted to native
  monthly RANGE partitions by a raw-SQL migration (`*_partition_transactions`). PKs are UUIDs (strings);
  `legacyId` is a plain index. These are **migration-managed** — use `prisma migrate deploy`,
  **never `migrate dev`**, or Prisma reports drift.
- **Docker is now running** the full live stack: `swat-postgres` (`:5432`), `swat-redis` (`:6379`),
  `swat-minio` (`:9000/9001`), `swat-nginx` (`:8088`), plus the legacy MySQL `dkp_swat` in
  `infra-db-1` (`:13306`) for migration. Dev servers run on `:4020` (backend) / `:4021` (web).
  Live `migrate deploy` / `db:seed` / partition-pruning / MinIO/Redis checks are runnable.
  (Historical: Phase 0 deferred all live infra because Docker was unavailable in this WSL distro.)

## Git / GitHub

- Remote: `git@github-personal:dlhsby/swat.git` (**temporarily public** — `dlhsby` org Actions
  billing; safe because committed env is dotenvx ciphertext; reverts to private next cycle). The
  `github-personal` SSH alias maps to the **`wahyutrip`** account (admin of `dlhsby` org). For any
  `dlhsby/*` git or `gh` work: `gh auth switch --user wahyutrip`. The `wahyutrip-gdp` account cannot
  push to org repos.
- CI/CD (Node 24, actions v6, `pnpm/action-setup` v9 at repo root): `quality.yml` (reusable suite) ·
  `pr-gate.yml` (required `gate` check on PRs to main/staging) · `deploy-staging.yml` (push to
  `staging`/dispatch → AWS deploy, one approval). **Flow: PR branch → `main` → `staging`** (pushing
  to `main` never deploys). On-prem prod stays platform-agnostic.
- **Deployment**: canonical spec [`specs/15-deployment.md`](specs/15-deployment.md); operational
  runbook `revamp/infra/aws/README.md`. Staging = AWS (shared `dlhsby` box, RDS db `swat_staging`, ECR,
  S3+instance-role, Caddy, OIDC→SSM); prod = `infra/docker-compose.prod.yml`.
