# Phase 1 — MVP · Implementation Status

**Status:** 🚧 **IN PROGRESS** — Milestones **M1 (Auth & RBAC)**, **M2 (backend master data)** and
**M3 (design-system component library)** complete and on `main` under green gates; **M4–M8** not yet
started.

> Build-side progress record for [`phase-1.md`](./phase-1.md), sequenced by
> [`phase-1-plan.md`](./phase-1-plan.md). Where this diverges from the spec, the divergence is
> intentional and flagged with a reason; otherwise the spec is authoritative.

| | |
|---|---|
| **Spec** | [`phase-1.md`](./phase-1.md) (18 epics, T-101…T-175) |
| **Plan** | [`phase-1-plan.md`](./phase-1-plan.md) — 8 milestones (M1 → M8) |
| **Delivered so far** | M1 (Epic 1.1) · M2 (Epics 1.2–1.6) · M3 (Epic 1.8.5) |
| **Commits** | `bc8acd3` (M1 auth/RBAC) · `b7301f8` (M2 master data) · `13aeecc` (Postman) · `b413a22` (review fixes + coverage) · `566859c` (M3 component library) — all on `main` |
| **Verified on** | 2026-06-08, PostgreSQL 15 + Redis 7 (Docker), Node 24 / pnpm 9 |
| **Stack added** | `express-session` + `connect-redis@9` (node-redis client) · `argon2` · class-validator DTOs |

---

## Milestone progress

| M | Scope (epics) | Status |
|---|---------------|--------|
| **M1** | 1.1 Auth & RBAC | ✅ Complete |
| **M2** | 1.2–1.6 backend master data | ✅ Complete |
| **M3** | 1.8.5 component library (34 components) | ✅ Complete |
| **M4** | 1.7–1.8 transactions backend | ⏳ Not started — **next** |
| **M5** | 1.9–1.12 frontend | ⏳ Not started |
| **M6** | 1.17 legacy parity | ⏳ Not started |
| **M7** | 1.13 migration scripts (dry-run) | ⏳ Not started |
| **M8** | 1.14–1.16 hardening / docs / cutover | ⏳ Not started |

---

## Quality gates (live run, 2026-06-08)

| Gate | Command | Result |
|------|---------|--------|
| Lint | `pnpm lint` | ✅ 0 warnings/errors |
| Typecheck | `pnpm typecheck` | ✅ 0 errors |
| Unit tests | `pnpm --filter @swat/backend test` | ✅ **222 tests, 32 suites** |
| Coverage gate | `--coverage` (threshold 90/78/90/90) | ✅ **96.6% stmts · 80.7% branch · 96.3% funcs · 96.5% lines** |
| E2E (live stack) | `pnpm --filter @swat/backend test:e2e` | ✅ auth + master-data suites pass against Docker Postgres/Redis |
| Build | `pnpm build` | ✅ |

**Coverage notes:** `auth.service.ts`, `login-throttle.service.ts`, `auth.guard.ts`,
`role-permissions.service.ts` all at **100%** (auth-critical, spec gate ≥95% met). Service layer
(business logic) carries the coverage; controllers (HTTP wiring) and repositories (Prisma wrappers)
are excluded from `collectCoverageFrom` and exercised via the e2e suites instead — an honest metric on
the layer that holds the rules.

---

## Surface delivered

- **20 controllers · 84 endpoints** (32 GET · 21 POST · 16 PATCH · 15 DELETE), all behind
  `AuthGuard` → `PermissionsGuard`, validated by the global pipe, wrapped in the `ApiResponse<T>`
  envelope, Indonesian error messages.
- **Postman collection** (`apps/backend/postman/`): 74 requests / 7 folders + local environment,
  cookie-auth, id-capturing POSTs. Regenerate with `node apps/backend/postman/generate.mjs`.

---

## M1 · Epic 1.1 — Auth & RBAC (T-101 … T-108)

| Task | Title | Status | Notes |
|------|-------|--------|-------|
| T-101 | User & role models (schema verification) | ✅ | Schema/migrations already applied in Phase 0; verification-only. Seed: admin (Argon2id), 92 permissions, 6 roles. |
| T-102 | `POST /auth/login` | ✅ | Argon2id verify; generic "Kredensial tidak valid"; rate-limit **5/IP/15 min → 429** (`LoginThrottleService`, Redis-backed); writes `AuthAuditLog`. |
| T-103 | `POST /auth/logout` | ✅ | Destroys session, clears `swat.sid` cookie; audit-logged. |
| T-104 | `GET /auth/me` | ✅ | Returns user + role + flattened permission keys + `mustChangePassword`. |
| T-105 | Permission guard & `@RequirePermissions` / `@CurrentUser` | ✅ | Global `AuthGuard` then `PermissionsGuard` (APP_GUARD). Wildcard match `*:*`, `resource:*`, exact. Role→permission keys cached in Redis (300s TTL) via `RolePermissionsService`. |
| T-106 | User CRUD | ✅ | `modules/users`; Argon2id on create; admin force-reset (`POST /auth/force-reset/:id`) + forced change-password; `PATCH /auth/change-password` clears flag. |
| T-107 | Role CRUD | ✅ | `modules/roles`; M2M permission upsert; cache invalidation on permission change; delete-blocked-when-assigned → 409. `GET /permissions` read endpoint. |
| T-108 | Permission seeding | ✅ | 92 permission keys, 6 roles seeded (verified Phase 0). |

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
pnpm --filter @swat/backend test -- --coverage          # 222 unit tests + coverage gate
pnpm --filter @swat/backend test:e2e                    # live auth + master-data e2e
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
- **Tests**: 77 vitest specs (jsdom + Testing Library); **component library 98.8% stmts · 87.1%
  branch · 94.6% funcs**. A dev-only `/[locale]/components` showcase renders every component across
  its states (the "states story" acceptance) for light/dark visual QA — not part of the production
  surface.

**Verification:** `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @swat/web build` all
green.

---

## What's next — M4 (Epics 1.7–1.8 transactions backend)

daily-init `@Cron` (idempotent) + TransactionDay CRUD; depart/return; REFUEL/PICKUP/DISPOSAL
(server-authoritative `netWeight = gross − tare`, reject `gross<tare`) / passive trips; verify + lock
(edits need `trip:verify:override`); partition-aware writes set `operationDate`. ≥90% on trip paths.
See [`phase-1-plan.md`](./phase-1-plan.md) § M4.
