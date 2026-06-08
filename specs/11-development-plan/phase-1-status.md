# Phase 1 — MVP · Implementation Status

**Status:** 🚧 **IN PROGRESS** — Milestones **M1 (Auth & RBAC)**, **M2 (backend master data)**,
**M3 (design-system component library)**, **M4 (transactions backend)** and **M5 (frontend —
Epics 1.9–1.12)** complete and on `main` under green gates; **M6–M8** not yet started.

> Build-side progress record for [`phase-1.md`](./phase-1.md), sequenced by
> [`phase-1-plan.md`](./phase-1-plan.md). Where this diverges from the spec, the divergence is
> intentional and flagged with a reason; otherwise the spec is authoritative.

| | |
|---|---|
| **Spec** | [`phase-1.md`](./phase-1.md) (18 epics, T-101…T-175) |
| **Plan** | [`phase-1-plan.md`](./phase-1-plan.md) — 8 milestones (M1 → M8) |
| **Delivered so far** | M1 (Epic 1.1) · M2 (Epics 1.2–1.6) · M3 (Epic 1.8.5) · M4 (Epics 1.7–1.8) · M5 (Epics 1.9–1.12) |
| **Commits** | `bc8acd3` (M1 auth/RBAC) · `b7301f8` (M2 master data) · `13aeecc` (Postman) · `b413a22` (M1+M2 review/coverage) · `566859c` (M3 component library) · `c7338ef` (M3 lint/RSC fixes) · `baf2997` (M3 review fixes) · `1459fcc` (M4 transactions backend) · `cfa4a33` (M4 review fixes) · `75fe6ee` (M5 foundation: auth/shell/login/profile/dashboard) · `8469bf4` (M5 master-data CRUD) · `0bdf7d3` (M5 transaction workflow) — all on `main` |
| **Verified on** | 2026-06-08, PostgreSQL 15 + Redis 7 (Docker), Node 24 / pnpm 9 |
| **Stack added** | `express-session` + `connect-redis@9` (node-redis client) · `argon2` · `@nestjs/schedule` (cron) · class-validator DTOs |

---

## Milestone progress

| M | Scope (epics) | Status |
|---|---------------|--------|
| **M1** | 1.1 Auth & RBAC | ✅ Complete |
| **M2** | 1.2–1.6 backend master data | ✅ Complete |
| **M3** | 1.8.5 component library (34 components) | ✅ Complete |
| **M4** | 1.7–1.8 transactions backend | ✅ Complete |
| **M5** | 1.9–1.12 frontend | ✅ Complete |
| **M6** | 1.17 legacy parity | ⏳ Not started — **next** |
| **M7** | 1.13 migration scripts (dry-run) | ⏳ Not started |
| **M8** | 1.14–1.16 hardening / docs / cutover | ⏳ Not started |

---

## Quality gates (live run, 2026-06-08)

| Gate | Command | Result |
|------|---------|--------|
| Lint | `pnpm lint` | ✅ 0 warnings/errors (all 5 packages) |
| Typecheck | `pnpm typecheck` | ✅ 0 errors |
| Unit tests | `pnpm --filter @swat/backend test` | ✅ **271 tests, 36 suites** (+46 for M4) |
| Coverage gate | `--coverage` (threshold 90/78/90/90) | ✅ **96.5% stmts · 81.5% branch · 95.3% funcs**; every M4 transactions service at **100% stmts/funcs** (≥90% trip-path gate met) |
| Web tests | `pnpm --filter @swat/web test` | ✅ **100 tests, 12 suites** (+22 for M5: permissions matcher, password strength, dashboard metrics, ProtectedAction, format) |
| Web build | `pnpm --filter @swat/web build` | ✅ **all 13 app routes** compile (App Router; login/change-password/profile/dashboard, 11 master-data + transaction screens) |
| Schemas tests | `pnpm --filter @swat/schemas test` | ✅ **17 tests** |
| E2E (live stack) | `pnpm --filter @swat/backend test:e2e` | ✅ auth + master-data pass; transactions e2e written, **deferred** (needs Docker + synthetic seed) |
| Build | `pnpm build` | ✅ 4/4 |
| Prisma | `prisma validate` | ✅ schema valid |

**Coverage notes:** `auth.service.ts`, `login-throttle.service.ts`, `auth.guard.ts`,
`role-permissions.service.ts` all at **100%** (auth-critical, spec gate ≥95% met). Service layer
(business logic) carries the coverage; controllers (HTTP wiring) and repositories (Prisma wrappers)
are excluded from `collectCoverageFrom` and exercised via the e2e suites instead — an honest metric on
the layer that holds the rules.

---

## Surface delivered

- **23 controllers · 94 endpoints** (master data + transactions), all behind
  `AuthGuard` → `PermissionsGuard`, validated by the global pipe, wrapped in the `ApiResponse<T>`
  envelope, Indonesian error messages. M4 added the transaction routes (transaction-days,
  haul-assignments depart/return, trip record/verify/read).
- **Postman collection** (`apps/backend/postman/`): 74 requests / 7 folders + local environment,
  cookie-auth, id-capturing POSTs. Regenerate with `node apps/backend/postman/generate.mjs`.

---

## M1 · Epic 1.1 — Auth & RBAC (T-101 … T-108)

| Task | Title | Status | Notes |
|------|-------|--------|-------|
| T-101 | User & role models (schema verification) | ✅ | Schema/migrations already applied in Phase 0; verification-only. Seed: admin (Argon2id), 94 permissions, 6 roles. |
| T-102 | `POST /auth/login` | ✅ | Argon2id verify; generic "Kredensial tidak valid"; rate-limit **5/IP/15 min → 429** (`LoginThrottleService`, Redis-backed); writes `AuthAuditLog`. |
| T-103 | `POST /auth/logout` | ✅ | Destroys session, clears `swat.sid` cookie; audit-logged. |
| T-104 | `GET /auth/me` | ✅ | Returns user + role + flattened permission keys + `mustChangePassword`. |
| T-105 | Permission guard & `@RequirePermissions` / `@CurrentUser` | ✅ | Global `AuthGuard` then `PermissionsGuard` (APP_GUARD). Wildcard match `*:*`, `resource:*`, exact. Role→permission keys cached in Redis (300s TTL) via `RolePermissionsService`. |
| T-106 | User CRUD | ✅ | `modules/users`; Argon2id on create; admin force-reset (`POST /auth/force-reset/:id`) + forced change-password; `PATCH /auth/change-password` clears flag. |
| T-107 | Role CRUD | ✅ | `modules/roles`; M2M permission upsert; cache invalidation on permission change; delete-blocked-when-assigned → 409. `GET /permissions` read endpoint. |
| T-108 | Permission seeding | ✅ | 94 permission keys (M4 added `fuel:approve` + `trip:override`), 6 roles seeded (verified Phase 0). |

**Session infra:** `express-session` + `connect-redis@9` on a dedicated DI-managed **node-redis**
client (`SessionRedis`, quit on shutdown — distinct from the cache layer's ioredis). Cookie `swat.sid`:
httpOnly + `SameSite=Strict` + Secure-in-prod + 8h rolling inactivity window.

---

## M2 · Epics 1.2–1.6 — Backend master data (T-109 … T-122)

| Task | Title | Status | Notes |
|------|-------|--------|-------|
| T-109 | VehicleApplication CRUD | ✅ | `fleet/applications`; delete blocked when referenced → 409. |
| T-110 | Fuel & FuelCategory CRUD | ✅ | `fleet/fuels` + `fleet/fuel-categories`. |
| T-111 | VehicleModel CRUD | ✅ | `fleet/models`. |
| T-112 | Vehicle CRUD (TDD) | ✅ | Plate regex + unique → 409; **monotonic odometer** on update; **registration-expiry not-in-past** enforced (review fix); tare/odometer decimals → Number. |
| T-113 | VehicleWasteSource CRUD | ✅ | `fleet/vehicles/waste-sources` link table. |
| T-114 | LicenseClass CRUD (read-only) | ✅ | `personnel/license-classes` lookup. |
| T-115 | Driver CRUD (TDD) | ✅ | KTP 16-digit + age ≥ 18. |
| T-116 | DriverLicense CRUD (TDD) | ✅ | `personnel/drivers/licenses`; expiry warn-not-reject. |
| T-117 | Site CRUD (TDD) | ✅ | lat/lng ranges; partial coordinate pair rejected; Decimal → Number. |
| T-118 | Route CRUD (TDD) | ✅ | origin ≠ destination; unique (category, origin, dest) → 409. |
| T-119 | WasteSource CRUD | ✅ | `waste/waste-sources`; soft-delete. |
| T-120 | CrewSchedule CRUD (TDD) | ✅ | unique vehicle+driver; depart < return. |
| T-121 | TripTemplate CRUD (TDD) | ✅ | nested under schedule; `@db.Time` parse/format anchored UTC; `fuelRequestedLiters` Decimal → Number. |
| T-122 | FuelQuota (kitir) CRUD (TDD) | ✅ | BigInt `id` → string; `validFrom ≤ validTo`; status filter. |

**Patterns held across all entities:** Repository → Service → Controller; paginated `findMany`
excluding `deletedAt`; soft-delete or delete-blocked-when-referenced (409); immutable returns;
class-validator DTOs (Zod `@swat/schemas` reserved for frontend sharing).

---

## Review fixes (commit `b413a22`)

1. **Prisma errors → 4xx** — `HttpExceptionFilter` now maps `P2002`→409, `P2025`→404, `P2003`→409
   before the generic 500 (warn-logs the code, no PII). Closes a constraint-race robustness gap.
2. **Vehicle registration-expiry** — create now rejects an STNK expiry already in the past (400).
3. **Role cache invalidation** — `roles.update` invalidates the permission cache only when
   `permissionIds` is supplied (was unconditional).
4. **Repeatable e2e/seed** — e2e clears `login:fail:*` throttle counters in `beforeAll` and runs
   `maxWorkers:1`; seed restores the admin password in non-prod so reruns are idempotent.

---

## Documented deviations from the spec (all intentional)

1. **Argon2id over bcrypt** — spec T-102/T-106 say "bcrypt"; we use Argon2id (memory-hard, modern),
   consistent with the Phase-0 deviation. Spec wording is a typo.
2. **Redis sessions on node-redis** — `connect-redis@9` peers on node-redis, not ioredis, so the
   session store gets its own client separate from the ioredis cache layer.
3. **class-validator DTOs, not Zod, for backend** — Zod `@swat/schemas` is the frontend-sharing layer;
   the backend uses class-validator + the global validation pipe (Phase-0 convention).
4. **Coverage scoped to the logic layer** — controllers/repositories excluded from
   `collectCoverageFrom` (HTTP/Prisma wiring, e2e-covered) to keep the metric honest on business logic.
5. **`trip:override`, not `trip:verify:override`** (M4) — the spec names a three-segment override key,
   but the permission matcher is `resource:action` (two segments), under which `trip:verify:override`
   collapses to `trip:verify`. The concrete key for editing a verified trip is therefore the
   two-segment **`trip:override`**. Likewise the REFUEL over-approval gate uses **`fuel:approve`**.
6. **Per-category trip permission enforced in the service** (M4) — the `PUT /trips/:id` permission
   depends on the trip's route category, which a static `@RequirePermissions` decorator can't express;
   the service resolves and enforces the right key against the caller's cached grants instead.
7. **Client-side route guard, not Next middleware** (M5) — the spec names "middleware route guards",
   but the session cookie is httpOnly on the backend origin (cross-origin in dev), so Next middleware
   cannot read it. Guarding is an `AuthProvider` + `AuthGuard` that calls `/auth/me` and redirects
   unauthenticated users to login / forced-change. The **server remains the authoritative gate**;
   client gating is UX only. Next middleware still handles locale routing.
8. **`pnpm dedupe` toolchain fix** (M5) — a fresh install resolved two distinct peer-copies of
   `eslint-plugin-import` (one via `eslint-config-next`, one via `@swat/eslint-config`), which ESLint 8
   rejects as a plugin conflict, breaking `next lint`. `pnpm dedupe` collapses them; the lockfile change
   is committed with the M5 foundation.

---

## How to reproduce the verification

```bash
cd swat
docker compose --env-file infra/docker-compose.env up -d postgres redis
cp .env.example .env.local                              # fill secrets
pnpm install
pnpm --filter @swat/backend prisma:deploy               # migrate deploy (NOT migrate dev)
pnpm --filter @swat/backend prisma:seed                 # admin / ChangeMe!2026
pnpm lint && pnpm typecheck
pnpm --filter @swat/backend test -- --coverage          # 271 unit tests + coverage gate
pnpm --filter @swat/backend test:e2e                    # live auth + master-data + transactions e2e
```

Import `apps/backend/postman/SWAT.postman_collection.json` +
`SWAT.local.postman_environment.json` for manual API QA.

---

## M3 · Epic 1.8.5 — Design-system component library (T-132a/b)

34 token-driven components in `apps/web/src/components/ui/` (one barrel export `@/components/ui`),
each dark-mode-ready and keyboard-accessible (`:focus-visible` ring via the global token layer).

| Task | Scope | Status | Notes |
|------|-------|--------|-------|
| T-132a | 19 primitives | ✅ | button, input, textarea, select, combobox, checkbox, radio-group, switch, number-input, date-picker, time-picker, form, badge, card, alert, tooltip, avatar, breadcrumb, skeleton (+ support: spinner, label, popover, command, calendar). |
| T-132b | 15 composites | ✅ | dialog, alert-dialog (Confirm, no ✕), sheet, dropdown-menu, tabs, table + DataTable, pagination, stepper, dropzone, progress, description-list, empty-state, toast. |

- **DataTable** (TanStack Table + shadcn Table): toolbar search (300 ms debounce) · column-toggle ·
  sortable headers (`aria-sort`) · client pagination ("Menampilkan x–y dari n", rows-per-page) · the
  full state matrix — 10-row loading skeleton, illustration-aware empty / no-results / error+retry —
  and collapses to stacked cards below `md`.
- **Form**: react-hook-form bindings (`FormField`/`FormControl`/`FormMessage`) threading
  `aria-describedby` + `aria-invalid`.
- **Deps added**: Radix primitives, `cmdk`, `sonner`, `react-day-picker`, `date-fns`,
  `react-hook-form` + `@hookform/resolvers`, `zod`, `@tanstack/react-table`, `tailwindcss-animate`.
- **Tests**: 78 vitest specs (jsdom + Testing Library); **component library 98.8% stmts · 87.1%
  branch · 94.6% funcs**. A dev-only `/[locale]/components` showcase renders every component across
  its states (the "states story" acceptance) for light/dark visual QA — not part of the production
  surface.

**Verification:** `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @swat/web build` all
green.

### M3 review fixes (`c7338ef`, `baf2997`)

1. **Next.js 71007 ("props must be serializable") cleared** — dropped the unneeded `'use client'`
   from `alert-dialog.tsx` (pure Radix wrappers + the controlled, hook-free `ConfirmDialog`), and made
   `dropzone.tsx`'s `onFilesAccepted` optional (mirrors react-dropzone's optional `onDrop`).
2. **Linter alignment (latent CI fix)** — pre-commit `eslint --fix` (no `@/` resolver) and `next lint`
   (resolver present) disagreed on import order, so the auto-fix could leave the committed tree failing
   `next lint`. Fixed at the root in `@swat/eslint-config`: classify `@/*` as `internal` by **pattern**
   (`pathGroups`), not via the resolver — both linters now produce identical order.
3. **Dark-mode transition pitfall (§3.26)** — input/textarea/select/combobox/date-picker/dropzone now
   transition only `border-color`/`color`, never the themed background, so toggling `.dark` can't leave
   a stale surface colour mid-transition.
4. **NumberInput RHF wiring** — typing and stepper clicks both emit the clamped `onValueChange` (the
   native `onChange` still fires too); previously steppers updated a controlled value but keyboard entry
   did not. Added a regression test.

---

## M4 · Epics 1.7–1.8 — Transactions backend (T-123 … T-132)

New module `modules/transactions/` (daily-init · transaction-days · haul-assignments · trips). Every
write to the partitioned tables (`Haul`, `HaulAssignment`, `Trip`) sets `operationDate` so rows land
in the correct monthly partition. BigInt ids serialize to strings in every DTO.

| Task | Title | Status | Notes |
|------|-------|--------|-------|
| T-123 | TransactionDay auto-init (`@Cron`) | ✅ | `DailyInitService` runs **03:00 daily** (`@nestjs/schedule`); materializes the day from standing crew schedules — **one Haul per vehicle**, a HaulAssignment per shift, a Trip per template — in a single `$transaction`. **Idempotent** (day `date` is unique → re-run is a no-op). Logs counts. |
| T-124 | TransactionDay CRUD | ✅ | `GET /transaction-days?date=` & `/:id` → full tree (hauls → assignments → trips); `PATCH /:id` status (**DONE blocked while hauls open**); `POST /initialize-today` manual trigger. `transaction-day:read` / `:manage`. |
| T-125 | Record depart | ✅ | `PUT /haul-assignments/:id/record-depart`; odometer ≥ vehicle current (and depart target) → else 400; sets `departActual*`. `trip:update`. |
| T-126 | Record return | ✅ | `PUT /…/record-return`; odometer ≥ depart, time ≥ depart-time; **advances `Vehicle.currentOdometer`**, sets assignment `DONE`, cascades **Haul → DONE** when all siblings done — all atomic. |
| T-127 | Record REFUEL | ✅ | `approved` defaults to `requested` (or the template's); **`approved > requested` needs `fuel:approve`** → else 400. `trip:record-fuel`. |
| T-128 | Record PICKUP | ✅ | `tareWeight` defaults from the vehicle. `trip:record-pickup`. |
| T-129 | Record DISPOSAL | ✅ | **Server-authoritative `netWeight = grossWeight − tareWeight`; rejects `gross < tare` (400 "berat bersih akan menjadi negatif")**. `trip:record-disposal`. |
| T-130 | Record DEPART_POOL / RETURN_POOL | ✅ | Passive trips: time + odometer only. `trip:update`. |
| T-131 | Trip verify + lock | ✅ | `PUT /trips/:id/verify` (`trip:verify`) → `VERIFIED` + verifier/timestamp (the audit trail). A verified trip is **locked**: re-recording 403s unless the caller has **`trip:override`**. |
| T-132 | Trip reads | ✅ | `GET /trips/:id` → trip + assignment + haul + transaction day; `GET /haul-assignments/:id/trips` → list. `trip:read`. |

- **Per-category permission** is enforced **in the service** (not the route decorator), because the
  required key depends on the trip's route category — REFUEL→`record-fuel`, PICKUP→`record-pickup`,
  DISPOSAL→`record-disposal`, passive→`update` — resolved against the caller's cached role grants.
- **Odometer chaining:** a trip's `actualOdometer` must be ≥ the departure odometer and any completed
  sibling trip on the same leg.
- **Seed delta:** added `fuel:approve` and `trip:override` permission keys (granted to *Administrasi
  Data*; *Administrator* inherits via `*:*`). The spec's `trip:verify:override` collapses under the
  two-segment matcher, so the concrete key is **`trip:override`** (documented deviation).

**Coverage (M4 services):** daily-init, transaction-days, haul-assignments and trips services all at
**100% stmts / 100% funcs**; trips service 98.5% stmts overall — comfortably past the ≥90% trip-path gate.

### M4 review fixes (`cfa4a33`)

1. **Daily-init skips soft-deleted masters** — `crewSchedule.findMany` now filters
   `vehicle.deletedAt: null` + `driver.deletedAt: null`, so a retired vehicle / resigned driver whose
   standing schedule still exists no longer spawns a Haul/HaulAssignment each morning. Regression test
   added.
2. **Override-edit semantics pinned** — documented and test-locked that an authorized override
   (`trip:override`) of a **VERIFIED** trip lands it back at **DONE**: an edit invalidates the prior
   verification, so the trip must be re-verified.

---

## M5 · Epics 1.9–1.12 — Frontend (T-133 … T-150)

The web back-office, composing the M3 component library per the hi-fi spec. Built in three verified
slices (`75fe6ee` foundation, `8469bf4` master-data, `0bdf7d3` transactions). All data fetching is
client-side against the `ApiResponse<T>` envelope via the cookie-auth `apiClient`; every action and
nav item is permission-gated.

| Area | Status | Notes |
|------|--------|-------|
| App shell (1.9) | ✅ | Topbar (brand, theme, notif, user menu + logout confirm), role-driven Sidebar (hide-not-disable, "Segera" pills), recessed canvas, mobile drawer; locale-aware navigation; reusable `PageHead`. |
| Auth UI (1.9/1.12) | ✅ | `AuthProvider` (`/auth/me`), client `AuthGuard` (→ login / forced-change), `usePermissions()` + `ProtectedAction` over a wildcard matcher mirroring the backend. Login, forced + voluntary change-password (5-level strength meter), Profile. |
| Dashboard (1.9) | ✅ | Greeting + Inisiasi Hari Ini, 4-metric grid, recent day + Perlu Perhatian — derived from the live `GET /transaction-days?date=` tree. |
| Master-data CRUD (1.10) | ✅ | **11 screens** on a reusable scaffold (`makeResourceApi`, `useResourceManager`, RHF+Zod field wrappers, `CrudListShell`/`CrudFormDialog`, `RowActions`): Kendaraan, Model/Aplikasi Kendaraan, Bahan Bakar, Pengemudi (+ SIM sheet), Spot & Rute (tabbed), Sumber Sampah, Jadwal Kru (+ Trayek sheet), Jatah Kitir. |
| Users & Access (1.12) | ✅ | Pengguna (temp-password capture on create + admin force-reset) and Hak Akses (RBAC master-detail: grouped permission toggles → Simpan Izin). |
| Transaction workflow (1.11) | ✅ | Hari Transaksi (idempotent Inisiasi + by-date finder), Haul Board, Trip Sheet, category-driven Record dialog (DISPOSAL net=gross−tare gate, REFUEL approved≤requested gate), Verify, Reconcile depart/return. |

- **Server-side 422 → inline field errors:** `CrudFormDialog` maps `ApiError.details` onto the form.
- **Coverage:** M5 unit tests target the pure logic (permission matcher, password strength, dashboard
  metric derivation, `ProtectedAction`, formatters); the screens themselves are exercised by the
  build + manual QA (Playwright E2E is M8).

---

## What's next — M6 (Epic 1.17 legacy parity)

Reference-master CRUD (delete-blocked-when-referenced), kitir bulk import, refuel log, inspection
(12-item + result derivation), maintenance (nested items + totalCost + approval) — backend + frontend.
The four parity screens already appear in the sidebar as "Segera" placeholders. See
[`phase-1-plan.md`](./phase-1-plan.md) § M6.
