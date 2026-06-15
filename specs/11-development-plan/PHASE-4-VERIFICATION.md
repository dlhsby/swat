# SWAT Phase 4 — Weighbridge Integration: Verification & Gap Analysis

Status of the TPA weighbridge REST API ([`phase-4.md`](./phase-4.md), contract
[`09-modules/integration-weighbridge.md`](../09-modules/integration-weighbridge.md)).
Verified **2026-06-15** against the live Docker stack (Postgres / Redis) and the `seed:demo`
dataset.

- **Admin login:** `admin` / `Password123!` · **API base:** `/api/v1` · **Swagger:** `/api/docs`
- **Auth (dual, OAuth2-primary):** interactive endpoints take a logged-in operator (OAuth2 bearer,
  role **Petugas Timbang** with `weighbridge:*`); a service-account API key (role **Integrasi
  Timbang**) covers unattended paths. Admin web UI at `/<locale>/service-accounts`.

---

## 1. Task status (T-401 … T-417)

| Task  | Item                                                         | Status      | Where                                                                                                         |
| ----- | ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| T-401 | ServiceAccount entity + API-key generation/validation/revoke | ✅          | `modules/service-accounts/`, `common/auth/api-key.ts`, migration `20260615000000_add_weighbridge_integration` |
| T-402 | Service-account CRUD (admin) + one-time key                  | ✅          | `service-accounts.controller.ts`, web `/service-accounts`                                                     |
| T-403 | API-key auth guard                                           | ✅          | `integrations/guards/weighbridge.guard.ts`, `decorators/weighbridge-auth.decorator.ts`                        |
| T-404 | Kitir resolution (by code / plate)                           | ✅          | `weighbridge/weighbridge-resolution.service.ts`, `weighbridge.repository.ts`                                  |
| T-405 | Weighing validation (server-side net)                        | ✅          | `weighbridge/weighbridge-validation.service.ts`                                                               |
| T-406 | `POST /weighbridge/resolve-kitir`                            | ✅          | `weighbridge/weighbridge.controller.ts`                                                                       |
| T-407 | Find/create DISPOSAL trip                                    | ✅          | `transactions/trip-finder.service.ts`                                                                         |
| T-408 | `POST /weighbridge/post-weighing`                            | ✅          | `weighbridge/weighbridge.service.ts`                                                                          |
| T-409 | TpaInboundLog insertion                                      | ✅          | `weighbridge/tpa-inbound-log.service.ts`                                                                      |
| T-410 | Idempotency-Key support (24h)                                | ✅          | `weighbridge/idempotency.service.ts` (Redis via `CacheService`)                                               |
| T-411 | Per-key rate limiting (+ IP allowlist)                       | ✅          | `integrations/rate-limit.service.ts`, guard                                                                   |
| T-412 | API-call audit logging (success + rejections)                | ✅          | `integrations/api-audit.service.ts`, `interceptors/api-audit.interceptor.ts`, `api-audit.controller.ts`       |
| T-413 | Offline queue design doc                                     | ✅          | `docs/WEIGHBRIDGE-OFFLINE-QUEUE.md`                                                                           |
| T-414 | Weighbridge E2E suite                                        | ✅          | `test/weighbridge.e2e-spec.ts` (11) + `test/service-accounts.e2e-spec.ts` (3)                                 |
| T-415 | API docs + Swagger                                           | ✅          | `docs/WEIGHBRIDGE-API.md`, `@ApiOperation` decorators                                                         |
| T-416 | Vendor staging integration test                              | ⏭️ Doc/plan | `docs/WEIGHBRIDGE-STAGING-TEST-PLAN.md` (run is a vendor coordination task)                                   |
| T-417 | Reconciliation design (Phase-2 impl)                         | ✅ design   | `docs/RECONCILIATION-DESIGN.md`                                                                               |

**Parity (G13/G14):** also delivered `PATCH /weighbridge/weighings/:tripId`
(`updatePembuanganTerverifikasi`), `GET /weighbridge/weighings` (`getpembuangansampahbyfilter`),
`post-weighing` `verified:true` (`insertPenimbanganTerverifikasi`), and the Excel bulk upload
`POST /weighbridge/import-excel` (`importexcel`) with `konversi_si_swat` SI→SWAT translation.

---

## 2. Automated verification (2026-06-15)

- **Backend:** `tsc` clean, `eslint` clean, `prettier --check` clean, **568 unit tests pass**
  (incl. guard, rate-limit, resolution, validation, trip-finder, service-account, Excel import,
  permissions-sync superuser-grants).
- **Web:** `tsc` clean, `eslint` clean, **167 tests pass**.
- **E2E against the live stack — 38 pass** (6 suites), including `weighbridge.e2e-spec.ts` and
  `service-accounts.e2e-spec.ts`:
  - resolve-kitir by code/plate → 200; missing both → 400; unknown/expired → 404.
  - post-weighing → 201 with server-computed net, Trip `DONE`, `recordedById` = operator,
    `TpaInboundLog` row created; gross<tare → 422; plate≠kitir → 409; no TransactionDay → 404.
  - idempotency: same key twice → 201,201, exactly one Trip + one log.
  - PATCH verify → 200 + `VERIFIED`; GET list → paginated.
  - service-account API-key path → 200; revoke → next call 401.
  - admin create returns the plaintext key once; list masks it to `apiKeyPrefix`.
- **Boot auto-grant proven:** stripping admin's `weighbridge:*` grants and restarting the app
  (e2e bootstrap) restored them via `PermissionsSyncService.ensureSuperuserGrants` — no `seed:auth`
  required.

## 3. Manual acceptance checklist

**Prereq [OPS]:** stack up, `prisma migrate deploy`, `pnpm db:seed:demo`. A fresh seed creates the
**Petugas Timbang** + **Integrasi Timbang** roles, the `weighbridge:*` / `service-account:*`
permissions, and a dev demo service account (key printed to the seed log). Existing DBs gain the new
admin grants automatically on next boot.

- [ ] **[WEB]** `/service-accounts` lists accounts (key masked), **Create** reveals the API key once
      (copy button), **revoke** disables it; **Log API** opens the audit viewer. Gated on
      `service-account:*`.
- [ ] **[API]** With the demo key (or an operator bearer): `POST /weighbridge/resolve-kitir` → 200;
      `POST /weighbridge/post-weighing` → 201 (net computed server-side); replay with same
      `Idempotency-Key` → no duplicate.
- [ ] **[API]** No/invalid credential → 401; missing `weighbridge:*` → 403; over the rate limit →
      429 + `Retry-After`; service-account IP outside its allowlist → 403.
- [ ] **[API]** `POST /weighbridge/import-excel` (multipart `file`) → `{inserted,skipped,errors}`;
      re-upload the same file → all skipped.
- [ ] **[OPS]** Every call appears in `/admin/api-audit-logs` (including rejected attempts); no
      secrets in summaries. `/api/docs` lists all weighbridge endpoints.

---

## 4. Gap analysis — deviations & deferrals

**Accepted deviations from the original spec (reasonable):**

- **Auth is dual, OAuth2-primary** (the draft assumed a faceless ServiceAccount). Operators
  authenticate individually so `Trip.recordedById` captures who weighed — better for the spec's own
  fraud-audit cases. The ServiceAccount remains for unattended machine paths.
- **UUID v7 PKs / `DisposalPermit`** throughout (the draft's Int ids / `quota` naming are obsolete).
- **Migration is hand-authored SQL** applied via `migrate deploy` (`migrate dev` is never run here).
- **Rate-limit is enforced in the guard** (after principal resolution) rather than a standalone
  middleware, so it can key on the resolved principal; it fails **open** on a Redis outage (the TPA
  is on the critical path) but now logs a warning when it does.

**Deferred (not blocking):**

- **T-416** — the joint vendor staging run is a coordination task; the test plan is written.
- **T-417 reconciliation job** — the nightly tonnage-vs-TpaInboundLog job lands in the Phase-2
  analytics track; Phase 4 ships the schema/indexes + design doc.
- **Offline queue** lives in the TPA desktop app (vendor); the server side (idempotency) is done.

## 5. Review fixes folded in (2026-06-15)

From a multi-agent review of the diff:

- **`trust proxy` set** in `configure-app.ts` so `req.ip` is the real client behind nginx — the
  service-account IP allowlist and audit IPs are now accurate (was comparing against the proxy IP).
- **Rejected calls are audited.** The guard records 401/403/429 attempts via
  `ApiAuditService.logRejection` (a guard rejection short-circuits before the audit interceptor), so
  brute-force / IP-spoof / invalid-key attempts leave a trail.
- **Excel import hardened:** out-of-range dates (e.g. `2026-13-32`) become a per-row error instead of
  an `Invalid Date` that aborted the whole batch with a 500; dedup + insert batched to one `findMany`
  - one `createMany` (was 2×N queries).
- **Rate-limit fail-open is now logged** (was silent) so a Redis outage is observable.
- **PATCH weighing** rejects (422) instead of silently zeroing weights when none were recorded.
- **`listWeighings`** surfaces the real `cctvReference` from `TpaInboundLog` and reuses the shared
  `paginated`/`toSkipTake` helpers (also `api-audit.list`).
- **Admin never needs a reseed for new permissions:** `PermissionsSyncService.ensureSuperuserGrants`
  reconciles the Administrator role to every catalog permission on boot + busts its cache.
