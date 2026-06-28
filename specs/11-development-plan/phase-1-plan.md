# SWAT Phase 1 — MVP Implementation Plan

## Context

SWAT is a waste-transport operations platform for **DLH Kota Surabaya**, replacing a legacy
CodeIgniter 2.1.4 app (`legacy/web/`). **Phase 0 (foundation) is complete, verified live, under green
CI.** This plan turns the Phase 1 spec (`specs/11-development-plan/phase-1.md` — 18 epics, ~79 tasks
T-101…T-175) into a sequenced, risk-aware build order, then **begins execution at Milestone 1 (Auth &
RBAC)** in this session.

**What already exists (do not re-scaffold):**
- **Prisma schema is complete** — every Phase-1 model is present, *including* the Epic-1.17 parity
  models `VehicleInspection`/`InspectionItem` and enhanced `MaintenanceRecord`/`MaintenanceItem`, plus
  enums (`InspectionResult`, `InspectionItemStatus`, `MaintenanceType`, `MaintenanceStatus`). Trip /
  Haul / HaulAssignment / TpaInboundLog are monthly-RANGE partitioned (composite PK incl.
  `operationDate`). **`migrate deploy` only, never `migrate dev`.** → **T-101 is verification-only.**
- **Seed is complete** — 45 permission keys, 6 roles (Administrator, Administrasi Data, Checker,
  Operator Pool, Petugas TPA, Supervisor), Argon2id admin (`admin`/`Password123!`,
  `mustChangePassword=true`), reference lookups (LicenseClass, FuelCategory, Fuel, VehicleApplication,
  WasteSource), and synthetic transactional data gated by `SEED_SYNTHETIC`. → **T-108 mostly done;
  T-175 adds any missing parity keys.**
- **Backend cross-cutting infra is wired** — `ApiResponse<T>` interceptor, `HttpExceptionFilter`
  (stable codes, field-grouped 422), strict global validation pipe, typed `ConfigService`
  (`SESSION_SECRET`, S3, Redis), Swagger at `/api/docs`, `modules/{storage,cache,analytics}`.
  **Missing: ALL auth/session code, guards, decorators, and every feature module.**
- **`@swat/schemas` started** — `common`, `user` (Login/Create/ChangePassword), `vehicle`, `driver`,
  `site`, `route` (Indonesian messages, `coerce`). Mirror this pattern for the rest.
- **Frontend scaffold** — tokens ported to `globals.css` + `tailwind.config.ts`, `components.json`,
  `lib/cn.ts`, `lib/status-pill.ts`, `lib/format.ts`, `api-client`, i18n (`messages/id-ID.json`,
  next-intl), theme toggle, PWA. **`components/ui/` is EMPTY — Epic 1.8.5 builds it.**

**Confirmed decisions (this session):** Redis session store (`express-session` + `connect-redis`,
8h inactivity TTL) · Migration = build scripts + dry-run vs the master-data sample dump, defer live
multi-TB run/cutover to on-prem (mirrors Phase-0 defer-live-infra) · Password recovery = admin
force-reset + forced change-password only (no SMTP).

---

## Build order & dependency graph

```
M1  Epic 1.1   Auth & RBAC ........................ gates EVERYTHING (sequential)
        │
        ├─────────────┬───────────────────────────────────────────┐
        ▼             ▼                                             ▼
M2  Backend master data (parallelizable after RBAC guards exist)   M3  Epic 1.8.5
    1.2 Fleet · 1.3 Personnel · 1.4 Geography ·                        Component library
    1.5 Waste · 1.6 Scheduling                                         (28 components)
        │                                                              │ gates 1.9–1.12
        ▼                                                              │
M4  1.7 Daily-init  →  1.8 Trip recording & verification              │
        │                                                              │
        └──────────────────────────┬───────────────────────────────────┘
                                    ▼
M5  Frontend  1.9 shell/auth/dashboard → 1.10 master CRUD →
              1.11 transaction workflow → 1.12 auth/permission UI
                                    │
                                    ▼
M6  Epic 1.17 Legacy-parity additions (1.70–1.75: ref-masters, kitir bulk
              import, refuel log, inspection, maintenance) — backend+frontend
                                    │  (parity GATES cutover)
                                    ▼
M7  1.13 Migration scripts (discovery → master → user/role → txn → images → verify)
                                    │
                                    ▼
M8  1.14 Testing hardening · 1.15 Docs/Docker · 1.16 Cutover runbook + rollback (DOCS/dry-run)
```

**Hard constraints:** auth (1.1) precedes all · component library (1.8.5) precedes all screens
(1.9–1.12) · parity (1.17) precedes migration-cutover (1.16) · migration validation (T-159) gates
parallel-run (T-166). **Parallelizable:** M2 backend master-data epics run independently of M3 the
component library (different files, different stack).

---

## Milestones (definition of done each)

| M | Scope (epics) | DoD |
|---|---------------|-----|
| **M1** | 1.1 Auth & RBAC | login/logout/me/change-password + admin force-reset; AuthGuard + PermissionsGuard + `@CurrentUser`/`@RequirePermissions`; users + roles CRUD; AuthAuditLog; login rate-limit; **auth ≥95% / others ≥80%**; lint+typecheck+test green |
| **M2** | 1.2–1.6 backend master data | All master CRUD endpoints (vehicles+models+apps+fuels, drivers+licenses, sites, routes, waste-sources, crew-schedules, trip-templates, disposal-permits) guarded, validated, soft-delete; ≥85% services |
| **M3** | 1.8.5 component library | 28 token-driven components (13 primitives + 15 composites), dark-mode + `:focus-visible` verified, DataTable all states; component tests |
| **M4** | 1.7–1.8 transactions backend | daily-init cron (idempotent) + TransactionDay CRUD; depart/return; REFUEL/PICKUP/DISPOSAL(net=gross−tare gate)/passive trips; verify+lock; ≥90% trip paths |
| **M5** | 1.9–1.12 frontend | App shell, login, forced-change, profile, dashboard; 7 master-data CRUD pages; Haul Board + Trip Sheet + record/verify forms; route guards + permission-gated UI |
| **M6** | 1.17 parity | ref-master CRUD (delete-blocked-when-referenced), kitir bulk import, refuel log, inspection (12-item + result derivation), maintenance (nested items + totalCost + approval); ≥80% |
| **M7** | 1.13 migration | discovery/migrate/images/verify scripts; idempotent by `legacyId`; dry-run green vs sample dump; reconciliation report |
| **M8** | 1.14–1.16 hardening | E2E (Playwright) critical flows; README/Swagger/prod Docker; cutover runbook + rollback (docs + staging dry-run) |

---

## Per-epic plan (actionable deltas only)

### M1 · Epic 1.1 — Auth & RBAC  *(this session)*
- **T-101** verify schema/migrations applied + seed (no code).
- **Session infra:** add `express-session` + `connect-redis` (reuse `modules/cache` ioredis client),
  httpOnly + `SameSite=Strict`, 8h TTL, secret from `ConfigService`. Wire in `main.ts` before routes.
- **Guards/decorators** (`src/common/`): `AuthGuard` (session→`req.user`), `PermissionsGuard`
  (wildcard match `*:*`/`resource:*`/exact via role→permissions), `@RequirePermissions(...keys)`,
  `@CurrentUser()`.
- **`modules/auth`:** `POST /auth/login` (Argon2id verify — reuse seed's `ARGON2_OPTIONS`; generic
  "Invalid credentials"; rate-limit 5/IP/15min → 429), `POST /auth/logout`, `GET /auth/me`
  (user+role+permissions+`mustChangePassword`), `PATCH /auth/change-password` (clears flag),
  `POST /auth/force-reset/:userId` (`user:manage`). Write `AuthAuditLog` on every event (no PII).
- **`modules/users`** (controller/service/repository/dto) + **`modules/roles`** (CRUD, M2M
  permission upsert, delete-blocked-when-assigned → 409). `permissions` read endpoint.
- **Schemas:** extend `@swat/schemas` — `auth.schema.ts`, `role.schema.ts`, finalize `user.schema.ts`.
- **Tests:** `auth.service.spec` + `auth.e2e-spec` + `rbac.guard.spec` (≥95% auth, ≥85% guard).
- **Gate:** `pnpm --filter @swat/backend test` green; `pnpm lint && pnpm typecheck` clean.

### M2 · Epics 1.2–1.5 master data (T-109–T-119)
Per entity: `controller` (guarded `@RequirePermissions`) → `service` (FK + business validation,
immutable returns) → `repository` (Prisma, paginated `findMany` excluding `deletedAt`) → Zod schema in
`@swat/schemas`. Key rules: vehicle plate regex+unique→409 + monotonic odometer; driver KTP 16-digit +
age≥18; site lat/lon ranges; route origin≠dest + unique triple→409; license expiry warn-not-reject.
Seed adds: WasteSource already present; ensure delete-blocked-when-referenced where FKs exist.

### M2 · Epic 1.6 scheduling (T-120–T-122)
CrewSchedule (unique vehicle+driver, depart<return), TripTemplate (nested under schedule, `@db.Time`),
DisposalPermit (UUID v7 `id` + `code`, validFrom≤validTo, status filter, `legacyId` bridge).

### M3 · Epic 1.8.5 component library (T-132a/b)
Add deps to `apps/web`: `sonner`, `react-hook-form`, `zod`, `cmdk`, `date-fns`, `@tanstack/react-table`
(+ Radix via shadcn add). **T-132a primitives:** button, input, textarea, select, combobox, checkbox,
radio-group, switch, number-input, date-picker, time-picker, form(FormField), badge(→`status-pill.ts`),
card, alert, tooltip, avatar, breadcrumb, skeleton. **T-132b composites:** dialog, alert-dialog
(Confirm, no ✕), sheet, dropdown-menu, tabs, table(DataTable: toolbar search 300ms/filter/column-toggle,
sortable, pagination, row actions, empty/loading/no-results/error + `<md` cards), pagination, stepper,
dropzone, progress, description-list, empty-state(illustration-aware), toast. Each: variants/sizes/states
+ `:focus-visible` ring + `.dark` verified + a states story.

### M4 · Epics 1.7–1.8 transactions (T-123–T-132)
daily-init `@Cron('0 3 * * *')` — idempotent (skip if TransactionDay exists), bulk-insert
Haul+HaulAssignment+Trip per active CrewSchedule in one tx. Trip recording is the **data-quality gate**:
DISPOSAL computes `netWeight = grossWeight − tareWeight` server-side, rejects `gross<tare` (400).
REFUEL: `approved≤requested` unless approve permission. Verify→`VERIFIED` + lock (edits need
`trip:verify:override`). All partition-aware writes set `operationDate`.

### M5 · Epics 1.9–1.12 frontend (T-133–T-150)
Compose M3 components per hi-fi (`specs/13-design/03-hifi-spec.md`); Indonesian labels verbatim from
`01-glossary.md`. App shell (topbar h76 + sidebar 256 + recessed canvas), login + forced-change +
profile + dashboard; 7 master CRUD pages (DataTable + Dialog forms); Haul Board + Trip Sheet +
record/verify forms; `usePermissions()` hook + `ProtectedAction` + middleware route guards.

### M6 · Epic 1.17 parity (T-170–T-175)
Models already exist. Ref-master CRUD (vehicle-models/applications/fuels) with
delete-blocked-when-referenced (409 + Indonesian msg); kitir `POST /disposal-permits/bulk-import`
(CSV/Excel upsert by `legacyId`, counts + error CSV); refuel read view (cost = approved×price/L +
anomaly flag); inspection (server-derived result: any FAIL→FAIL, any ATTENTION→ATTENTION, else PASS;
seed 12-item template); maintenance (nested items, `totalCost`=Σ, `PATCH /approve` gated). T-175 seed
delta + sidebar visibility per `:read`.

### M7 · Epic 1.13 migration (T-151–T-159)  *(scripts + dry-run only)*
Create `scripts/` (new): `migrate-discovery.ts` (read-only profile), `migrate-legacy.ts` (keyset-paged,
resumable by watermark, idempotent by `legacyId`, dependency order per `04-migration.md` §3),
`migrate-images.ts` (filesystem→MinIO, bounded concurrency, SHA256 verify, `Photo` rows),
`verify-migration.ts` (per-table/year reconciliation ≤1%, FK spot-check, exit 1 on critical). Data-quality
fixes per §4 (0000 dates/1900 years/(0,0) GPS→NULL, dedup routes). Users: **never migrate MD5** →
random Argon2 + `mustChangePassword`. Dry-run vs `legacy/web/db_backup/dkp_swat_2026_05_18_data.sql`.

### M8 · Epics 1.14–1.16 hardening (T-160–T-169)
Playwright E2E (login, vehicle CRUD, driver+license, day-init→depart→pickup→disposal→verify); README +
Swagger decorators + multi-stage Dockerfiles + `docker-compose.prod.yml` + Nginx; cutover runbook +
rollback plan (docs + staging dry-run). **Live cutover execution is the user's on-prem step.**

---

## Critical path & risks

| Risk | Mitigation |
|------|-----------|
| **RBAC correctness** (over/under-permitting) | ≥95% auth coverage; explicit e2e per role; wildcard-match unit tests; admin `*:*` always-allow path tested |
| **Partition-aware writes** (wrong `operationDate` → wrong partition) | Always set `operationDate` from business date in daily-init + trip writes; `migrate deploy` only; e2e asserts partition pruning |
| **DISPOSAL weighing integrity** | Server authoritative `netWeight`; reject `gross<tare`; ≥90% coverage on trip recording |
| **Legacy migration fidelity** (live volumes unknown) | Discovery-first; idempotent + resumable; per-year ≤1% reconciliation gate; dry-run vs sample before live |
| **Image-corpus volume** (multi-TB) | Bounded-concurrency streamed upload + checksum + orphan report; resumable; deferred to on-prem |
| **Parity gaps vs `legacy/web`** | Epic 1.17 gates cutover; module specs (`inspection/maintenance/disposal-permits.md`) + legacy controllers as reference |
| **Component-library drift from hi-fi** | Build 1.8.5 first; token-driven only; dark + `:focus-visible` verified per component before screens |

---

## Open items already resolved (assumptions stated)
- "bcrypt" in spec = **Argon2id** (Phase-0 deviation, keep).
- T-106 spec says "hash with bcrypt" → use Argon2id (consistency).
- `packages/types` not created (no shared runtime type yet) — add only if one appears.
- Session = Redis; password recovery = admin force-reset; migration = scripts+dry-run (all confirmed).

---

## Verification plan

Each milestone proven the Phase-0 way: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green
locally + CI. Backend behaviour via supertest e2e (separate test Postgres) + Swagger manual QA. Coverage
gates enforced (auth ≥95%, services ≥85%, trip recording ≥90%, screens ≥80%). Frontend via component
tests + Playwright E2E on the docker-compose stack. Migration via dry-run + reconciliation report exit
code. Partition pruning re-checked with `EXPLAIN`.

**M1 acceptance (this session):**
1. `pnpm --filter @swat/backend test` — auth/users/roles green, auth ≥95%.
2. Live: `POST /api/v1/auth/login {admin/Password123!}` → 200 + httpOnly cookie + `mustChangePassword:true`.
3. `GET /api/v1/auth/me` → user+role+permissions; no session → 401.
4. Guarded endpoint without permission → 403; with → 200; admin `*:*` → always 200.
5. `PATCH /auth/change-password` clears flag; 6th bad login in 15min → 429.
6. `pnpm lint && pnpm typecheck` clean. Conventional Commits per change.

---

## On approval
1. Save this plan to `specs/11-development-plan/phase-1-plan.md` (committed artifact).
2. Branch off `main` (e.g. `feat/phase-1-auth-rbac`).
3. Build **Milestone 1** end-to-end with TDD (RED→GREEN→refactor), then report M1 verification before
   proceeding to M2.
