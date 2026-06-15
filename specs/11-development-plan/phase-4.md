# Phase 4 — Weighbridge Integration

> **Implementation status (built 2026-06-15):** ✅ **Complete.** Decisions taken
> during build that supersede the original draft below:
>
> - **Auth is dual, OAuth2-primary.** Interactive endpoints (resolve-kitir,
>   post-weighing, PATCH, GET-list, import-excel) accept a logged-in **operator**
>   via the Phase-1 per-user OAuth2 bearer (new `weighbridge:*` permissions; role
>   **Petugas Timbang**) — the operator's id is stamped on `Trip.recordedById`. A
>   single `WeighbridgeGuard` **also** accepts a `ServiceAccount` API key (role
>   **Integrasi Timbang**) for unattended paths. Rate-limit + IP-allowlist apply to
>   both principal types. ServiceAccount + API key are implemented exactly as T-401–403.
> - **UUID v7 PKs everywhere** (the draft's Int ids / `quota` naming are obsolete;
>   the entity is `DisposalPermit`, the kitir).
> - **Migrations are hand-authored SQL** applied via `migrate deploy` (`migrate dev`
>   is never run on this repo): `20260615000000_add_weighbridge_integration` adds
>   `service_account`, `api_audit_log`, `konversi_si_swat` + the `ApiPrincipalType` enum.
> - **Module layout:** `modules/service-accounts/` (CRUD) and `modules/integrations/`
>   (guard, rate-limit, api-audit, `weighbridge/` services + controller). Web admin
>   UI at `/service-accounts` (+ `/service-accounts/audit-log`).
> - **Scope = everything:** core endpoints + SOAP parity (PATCH update, GET list,
>   Excel bulk upload + `konversi_si_swat`) + design docs (`docs/WEIGHBRIDGE-API.md`,
>   `WEIGHBRIDGE-OFFLINE-QUEUE.md`, `RECONCILIATION-DESIGN.md`,
>   `WEIGHBRIDGE-STAGING-TEST-PLAN.md`). T-416 (vendor staging run) remains a doc/plan.
> - **Deploy note:** `trust proxy` is enabled so `req.ip` is the real client behind
>   nginx (the IP allowlist + audit IPs depend on it). New permissions are granted to
>   the **Administrator** role automatically on boot (`PermissionsSyncService`), so an
>   existing DB needs **no** reseed; a fresh `seed:demo`/`seed:auth` creates the new
>   roles + the demo service account.
> - **Tests:** unit specs per service + `test/weighbridge.e2e-spec.ts` (11) and
>   `test/service-accounts.e2e-spec.ts` (3), green against the live stack. Full
>   verification: [`PHASE-4-VERIFICATION.md`](./PHASE-4-VERIFICATION.md).

## Overview

Integrate the TPA (Tempat Pembuangan Akhir) weighbridge desktop application via RESTful API. Replace legacy SOAP endpoints. Enable automatic posting of weighing results from the TPA scale system, with server-side validation, idempotency, and reconciliation against daily trip data.

**Effort:** 2–3 weeks. **Dependencies:** Phase 1 complete; DisposalPermit, trip recording, and TransactionDay operational.

> **Parity scope (see [`09-modules/integration-weighbridge.md`](../09-modules/integration-weighbridge.md)):**
> the new REST API must cover **all 5 legacy SOAP methods** (`insertDB`, `insertPenimbanganTerverifikasi`,
> `updatePembuanganTerverifikasi`, `insertJatahKitir`, `getpembuangansampahbyfilter`) per the SOAP→REST
> mapping table (G13). Also model **`konversi_si_swat`** (SI↔SWAT unit/name conversion) and build the
> **Excel weighing upload** ("Upload Data Penimbangan", legacy `importexcel`) ingest into `TpaInboundLog`
> (G14) — distinct from the Phase-1 kitir bulk import.

**Key deliverables:**

- Service account / API key authentication for the TPA desktop client.
- Resolve-kitir endpoint (by code or plate) → vehicle details, tare weight, authorization.
- Post-weighing endpoint → create/update DISPOSAL trip, compute net weight server-side, idempotent.
- TpaInboundLog ingestion and audit trail.
- Rate limiting, offline fallback queue (stub).

---

## Epic 4.1 — API Key & Service Account Management (Size: M)

**Parallel group:** 4.1 can run in parallel with 4.2; both required before 4.3.

#### T-401. ServiceAccount entity & API key generation

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** Phase 1 complete (User/Role/Permission seeded)
- **Files:**
  - `apps/backend/prisma/schema.prisma` (modify)
  - `apps/backend/prisma/migrations/` (new migration: ServiceAccount table)
  - `apps/backend/src/modules/service-accounts/service-account.entity.ts` (create)
  - `apps/backend/src/modules/service-accounts/service-account.service.ts` (create)
  - `apps/backend/src/modules/service-accounts/dto/create-service-account.dto.ts` (create)
  - `apps/backend/test/service-accounts.spec.ts` (create)
- **Steps:**
  1. **Schema:** Add `ServiceAccount` table: id (PK), name, apiKeyHash (hashed), active (boolean), rateLimit (int, default 500), allowedIPs (JSON array, optional), createdAt, updatedAt, revokedAt (nullable).
  2. **Service:** `createServiceAccount(name, rateLimit?, allowedIPs?)` → generate random 64-char API key, hash with bcrypt, store hash + metadata, return plaintext key **once** to caller.
  3. `validateApiKey(key)` → hash input, compare to stored hash, return ServiceAccount or null.
  4. `revokeServiceAccount(id)` → set revokedAt = now, mark inactive.
  5. **Tests (TDD):**
     - Generate key is random, non-empty.
     - Hash is different from plaintext.
     - Validation succeeds with correct key, fails with wrong key.
     - Revocation works (inactive flag set).
- **Acceptance criteria:**
  - [ ] ServiceAccount table exists with all fields.
  - [ ] API key generation: random 64 chars, hashed before storage.
  - [ ] `createServiceAccount` returns plaintext key (one-time); subsequent calls return null.
  - [ ] `validateApiKey` returns ServiceAccount or null; never returns plaintext key.
  - [ ] Revocation sets active=false, revokedAt=now.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-402. Service account CRUD endpoints (admin UI)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-401
- **Files:**
  - `apps/backend/src/modules/service-accounts/service-accounts.controller.ts` (create)
  - `apps/backend/src/modules/service-accounts/service-accounts.repository.ts` (create)
  - `apps/backend/src/modules/service-accounts/service-accounts.module.ts` (create)
  - `apps/backend/src/modules/service-accounts/dto/update-service-account.dto.ts` (create)
  - `apps/backend/test/service-accounts.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `GET /api/v1/admin/service-accounts` → 200, list with name, active, rateLimit, lastUsedAt, Actions (revoke).
     - `POST /api/v1/admin/service-accounts { name, rateLimit, allowedIPs }` → 201, return ServiceAccount + plaintext apiKey.
     - `PATCH /api/v1/admin/service-accounts/:id { name, rateLimit, active }` → 200, updated.
     - `DELETE /api/v1/admin/service-accounts/:id` (or PATCH active=false) → 200, revoked.
     - All guarded: admin only (`admin:*` permission).
  2. **Implement (GREEN):**
     - ServiceAccountsController: standard CRUD + wrapper for service layer.
     - Response DTO: masks apiKeyHash, never returns plaintext key in GET (only in POST create).
  3. **Refactor:** consistent DTO usage, clean error messages.
- **Acceptance criteria:**
  - [ ] `GET /admin/service-accounts` → 200, list excludes plaintext keys.
  - [ ] `POST /admin/service-accounts` → 201, returns full response including plaintext key (warning: one-time display).
  - [ ] `PATCH /admin/service-accounts/:id` → 200, updates metadata.
  - [ ] `DELETE /admin/service-accounts/:id` (or revoke) → 200, inactive.
  - [ ] All endpoints guarded (403 without admin permission).
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-403. API key authentication guard (middleware)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-401
- **Files:**
  - `apps/backend/src/modules/integrations/guards/api-key.guard.ts` (create)
  - `apps/backend/src/modules/integrations/decorators/api-key.decorator.ts` (create)
  - `apps/backend/test/api-key.guard.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - Request with valid API key (`Authorization: Bearer <key>` or `X-API-Key: <key>`) → proceeds, injects ServiceAccount into request context.
     - Request with invalid key → 401 Unauthorized.
     - Request with revoked key → 401 Unauthorized.
     - Request without key → 401 Unauthorized.
  2. **Implement (GREEN):**
     - `@ApiKeyAuth()` decorator (like `@HasPermission` but for API keys).
     - Guard: extract header, validate against ServiceAccount, attach to `request.serviceAccount`.
     - Throw UnauthorizedException if validation fails.
  3. **Refactor:** support both Bearer token + X-API-Key header.
- **Acceptance criteria:**
  - [ ] Valid API key → request succeeds; ServiceAccount available in handler.
  - [ ] Invalid/missing key → 401 "Unauthorized".
  - [ ] Revoked key → 401 "Unauthorized".
  - [ ] Unit tests ≥85%; lint/typecheck clean.

---

## Epic 4.2 — Weighbridge Resolution & Validation (Size: M)

**Parallel group:** 4.2 in parallel with 4.1; both before 4.3.

#### T-404. DisposalPermit resolution service (by code or plate)

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** Phase 1 (DisposalPermit CRUD + schema complete)
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/weighbridge-resolution.service.ts` (create)
  - `packages/schemas/src/weighbridge.schema.ts` (create)
  - `apps/backend/test/weighbridge-resolution.service.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `resolveKitir(code, date)` → find DisposalPermit by parsed ID, check ACTIVE status, within validity window → return { id, vehicleId, plateNumber, siteId, siteName, vehicle: { brand, model, currentTareWeight, normalTareWeight, maxNetLoad, maxNetVolume } }.
     - `resolveKitir(null, date)` → throw ValidationError "code required".
     - Expired permit (validTo < date) → throw NotFoundError "kitir expired".
     - `resolveKitirByPlate(plate, date)` → find Vehicle by plate, then DisposalPermit for TPA site within date range → same return.
     - Plate not found → throw NotFoundError.
  2. **Implement (GREEN):**
     - Service: database queries with indexes on (vehicleId, validFrom, validTo, status).
     - Include vehicle.model for brand/specs.
     - Return DTO per integration-weighbridge spec §2.1.
  3. **Refactor:** extract query logic to repository.
- **Acceptance criteria:**
  - [ ] Resolve by kitir code: find DisposalPermit, check status + date window, return full vehicle specs.
  - [ ] Resolve by plate: find vehicle, then quota for TPA site.
  - [ ] Invalid code / expired quota → 404 NotFoundError.
  - [ ] Unit tests ≥90% (critical path); lint/typecheck clean.

#### T-405. Weighing validation service (weights, tare, net)

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-404
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/weighbridge-validation.service.ts` (create)
  - `apps/backend/test/weighbridge-validation.service.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `validateWeighing(grossWeight, tareWeight, vehicle)` → if grossWeight >= tareWeight, return { netWeight: gross - tare, valid: true }.
     - If grossWeight < tareWeight → return { valid: false, error: "grossWeight must be >= tareWeight" }.
     - If grossWeight or tareWeight is negative → invalid.
     - Net weight vs maxNetLoad: warn if net > maxNetLoad (data quality flag, don't block).
  2. **Implement (GREEN):**
     - Server-side computation of netWeight (CRITICAL — never trust client input).
     - Validation rules per 09-modules/integration-weighbridge.md §2.2.
  3. **Refactor:** unit-testable validation (pure functions preferred).
- **Acceptance criteria:**
  - [ ] `validateWeighing` computes netWeight = gross - tare.
  - [ ] Rejects if gross < tare (422 Unprocessable Entity).
  - [ ] Warns (but allows) if net > maxNetLoad.
  - [ ] Unit tests ≥90%; lint/typecheck clean.

---

## Epic 4.3 — Resolve-Kitir Endpoint (Size: M)

#### T-406. POST /api/v1/weighbridge/resolve-kitir endpoint

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-403 (API key guard), T-404 (resolution service), T-405 (validation service)
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/weighbridge.controller.ts` (create)
  - `apps/backend/src/modules/integrations/weighbridge/dto/resolve-kitir.dto.ts` (create)
  - `apps/backend/src/modules/integrations/weighbridge/dto/resolve-kitir.response.ts` (create)
  - `apps/backend/src/modules/integrations/weighbridge/weighbridge.module.ts` (create)
  - `apps/backend/test/weighbridge.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `POST /api/v1/weighbridge/resolve-kitir { code: "KT-202606-0042", date: "2026-06-05" }` → 200, { success: true, data: { id, vehicleId, plateNumber, siteId, siteName, status, validFrom, validTo, vehicle: { ... } } }.
     - `POST /api/v1/weighbridge/resolve-kitir { plateNumber: "L-1234-AB", date: "2026-06-05" }` → 200, same response.
     - Missing code + plate → 400 "code or plateNumber required".
     - Kitir not found / inactive / expired → 404 { success: false, error: { code: "NOT_FOUND", message: "..." } }.
     - Invalid date format → 400 "Invalid date".
     - No API key → 401 "Unauthorized".
  2. **Implement (GREEN):**
     - Controller: `@UseGuards(ApiKeyAuthGuard)` + `@ApiKeyAuth()` decorator.
     - Validate request DTO (Zod schema).
     - Call `WeighbridgeResolutionService.resolveKitir` or `...resolveKitirByPlate`.
     - Return ApiResponse per spec.
     - Catch errors, map to proper HTTP status + error object.
  3. **Refactor:** clean error handling, structured logging (no PII).
  4. **Swagger:** document endpoint with descriptions, request/response examples, error codes.
- **Acceptance criteria:**
  - [ ] `POST /weighbridge/resolve-kitir` with valid code → 200, full vehicle specs returned.
  - [ ] With valid plate → 200, same response.
  - [ ] Missing code + plate → 400 "code or plateNumber required".
  - [ ] Expired/inactive kitir → 404.
  - [ ] No API key / invalid key → 401.
  - [ ] Response matches integration-weighbridge spec §1.1 exactly.
  - [ ] E2E tests (happy path + error cases) ≥90%; lint/typecheck clean.

---

## Epic 4.4 — Post-Weighing Endpoint & Trip Integration (Size: L)

#### T-407. Find or create DISPOSAL trip for weighing

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** Phase 1 (Trip + TransactionDay + Haul operational)
- **Files:**
  - `apps/backend/src/modules/transactions/trip-finder.service.ts` (create)
  - `apps/backend/test/trip-finder.service.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `findOrCreateDisposalTrip(vehicleId, date, siteId, transactionDay)` → find Haul for (transactionDay, vehicle); find DISPOSAL trip in haul's assignments.
     - If DISPOSAL trip exists + status not VERIFIED → return it.
     - If no DISPOSAL trip, create ad-hoc trip (with inferred DISPOSAL route to TPA site).
     - If Haul not found → throw NotFoundError "Haul not found for vehicle+date".
  2. **Implement (GREEN):**
     - Query Haul by (transactionDayId, vehicleId).
     - Query Trip by (haulId, status != VERIFIED, category = DISPOSAL).
     - If not found: look up Route with category=DISPOSAL, destinationSite=TPA; create Trip.
     - If no DISPOSAL route → throw NotFoundError "No DISPOSAL route to TPA".
  3. **Refactor:** extract route lookup, transaction boundaries.
- **Acceptance criteria:**
  - [ ] Finds existing DISPOSAL trip in haul.
  - [ ] Creates ad-hoc DISPOSAL trip if not found (with inferred route).
  - [ ] Returns error if Haul or DISPOSAL route not found.
  - [ ] Unit tests ≥85%; lint/typecheck clean.

#### T-408. POST /api/v1/weighbridge/post-weighing endpoint

- **Size:** L · **Coverage:** ≥90%
- **Depends on:** T-403 (API key guard), T-404 (resolution), T-405 (validation), T-407 (trip finder)
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/weighbridge.controller.ts` (modify)
  - `apps/backend/src/modules/integrations/weighbridge/weighbridge.service.ts` (create)
  - `apps/backend/src/modules/integrations/weighbridge/dto/post-weighing.dto.ts` (create)
  - `apps/backend/src/modules/integrations/weighbridge/dto/post-weighing.response.ts` (create)
  - `apps/backend/test/weighbridge.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):**
     - `POST /api/v1/weighbridge/post-weighing { kitirId, plateNumber, date, time, grossWeight, tareWeight, wasteVolume, cctvReference, notes }` → 201, { success: true, data: { id, kitirId, tripId, netWeight, recordedAt, cctvReference } }.
     - Gross < tare → 422 "Invalid input" with detail.
     - Plate mismatch (plate not equal to quota vehicle plate) → 409 Conflict.
     - Kitir not found → 404.
     - No TransactionDay for date → 404 or 409.
     - Invalid JSON / missing required fields → 400.
     - No API key / invalid key → 401.
  2. **Implement (GREEN):**
     - WeighbridgeService.postWeighing:
       1. Resolve kitir (call T-404 service).
       2. Verify plate matches quota vehicle (409 if not).
       3. Validate weights (call T-405 service; 422 if invalid).
       4. Compute netWeight = gross - tare (server-side, critical).
       5. Find TransactionDay for date.
       6. Find or create DISPOSAL Trip (call T-407 service).
       7. Update Trip: tareWeight, grossWeight, netWeight, wasteVolume, actualTime, status=DONE, cctvReference in notes/metadata.
       8. Create TpaInboundLog (see T-409).
       9. Return response per spec §1.2.
     - Error handling: map exceptions to correct HTTP status + error object.
  3. **Refactor:** extract WeighingProcessor for transaction handling.
- **Acceptance criteria:**
  - [ ] `POST /weighbridge/post-weighing` with valid request → 201, Trip updated, TpaInboundLog created.
  - [ ] Net weight computed server-side: netWeight = gross - tare.
  - [ ] Gross < tare → 422 "Invalid input".
  - [ ] Plate mismatch → 409 Conflict.
  - [ ] Missing TransactionDay → 404 or 409.
  - [ ] Response matches spec §1.2 exactly.
  - [ ] E2E tests (happy path + all error cases) ≥90%; lint/typecheck clean.

#### T-409. TpaInboundLog insertion & audit trail

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** Phase 1 (TpaInboundLog table + indexes)
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/tpa-inbound-log.service.ts` (create)
  - `apps/backend/test/tpa-inbound-log.service.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `createTpaInboundLog(weighing: PostWeighingDto, tripId: BigInt)` → insert into TpaInboundLog with date, plateNumber, depot (from vehicle pool), sourceTruck, gross/tare/net/cctvReference, tripId FK.
     - Verify record created with all fields.
     - Verify indexes on (date), (plateNumber), (tripId).
  2. **Implement (GREEN):**
     - Service: call Prisma create; populate dateLabel, depot (from vehicle.poolSite.name), sourceTruck (from vehicle.plateNumber).
     - Link to Trip via tripId FK.
  3. **Refactor:** consistent DTO usage.
- **Acceptance criteria:**
  - [ ] TpaInboundLog inserted after each weighing POST.
  - [ ] All fields populated (date, plate, depot, weights, cctvReference, tripId).
  - [ ] Indexes on (date), (plateNumber), (tripId) functional.
  - [ ] Unit tests ≥85%; lint/typecheck clean.

#### T-410. Idempotency key support (optional header)

- **Size:** S · **Coverage:** ≥80%
- **Depends on:** T-408 (post-weighing endpoint)
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/idempotency.service.ts` (create)
  - `apps/backend/src/common/interceptors/idempotency.interceptor.ts` (create)
  - `apps/backend/test/idempotency.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - Send `POST /weighbridge/post-weighing` with `Idempotency-Key: <UUID>` → 201, response cached for 24 hours.
     - Retry with same key → 201, same response (no duplicate Trip/TpaInboundLog).
     - Different key → creates new record.
     - No key → normal processing (no caching).
  2. **Implement (GREEN):**
     - IdempotencyService: key-based cache (Redis or in-memory for Phase 4; Redis preferred).
     - Interceptor: check cache before operation, store response after success.
     - Cache TTL: 24 hours.
  3. **Refactor:** clean cache lookup / store logic.
- **Acceptance criteria:**
  - [ ] Idempotency-Key header optional.
  - [ ] With key: identical retries return same response, no duplicates.
  - [ ] Cache TTL: 24 hours.
  - [ ] Unit tests ≥80%; lint/typecheck clean.

---

## Epic 4.5 — Rate Limiting & Monitoring (Size: S)

#### T-411. Rate limiting per API key (middleware)

- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-403 (API key guard)
- **Files:**
  - `apps/backend/src/modules/integrations/middleware/rate-limit.middleware.ts` (create)
  - `apps/backend/src/config/rate-limit.config.ts` (create)
  - `apps/backend/test/rate-limit.middleware.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - `POST /weighbridge/...` with API key → increments counter per key in Redis.
     - Requests within limit (e.g., 500/min) → proceed.
     - Requests exceeding limit → 429 Too Many Requests with `Retry-After` header.
     - Different keys → separate limits.
  2. **Implement (GREEN):**
     - Middleware: extract ServiceAccount from request context (set by T-403 guard).
     - Check Redis counter for `serviceAccount:${id}:requests` (1-minute window, sliding or fixed).
     - Increment counter, set TTL to 60 sec.
     - If counter > rateLimit (from ServiceAccount.rateLimit) → throw TooManyRequestsException.
     - Return 429 with `Retry-After: <seconds>`.
  3. **Refactor:** sliding window or token bucket pattern (fixed window simpler for Phase 4).
- **Acceptance criteria:**
  - [ ] Rate limit enforced per API key (default 500/min, configurable per account).
  - [ ] Requests within limit → 200/201.
  - [ ] Requests exceeding limit → 429 "Too Many Requests".
  - [ ] `Retry-After` header present in 429 response.
  - [ ] Unit tests ≥85%; lint/typecheck clean.

#### T-412. API call audit logging

- **Size:** S · **Coverage:** ≥80%
- **Depends on:** T-406, T-408 (weighbridge endpoints)
- **Files:**
  - `apps/backend/src/modules/integrations/weighbridge/api-audit.service.ts` (create)
  - `apps/backend/test/api-audit.service.spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - Log every weighbridge API call: timestamp, serviceAccountId, endpoint, request summary, response status, response summary, IP, user agent.
     - Store in database (`ApiAuditLog` table or similar) or structured log file.
     - Avoid logging sensitive fields (API keys, password hashes, full request bodies if large).
  2. **Implement (GREEN):**
     - Create ApiAuditLog entity (or log to structured logger).
     - Interceptor or service layer: after each weighbridge endpoint, call `ApiAuditService.logCall(...)`.
     - Fields: timestamp, serviceAccountId, endpoint, statusCode, requestSummary, responseSummary, ipAddress, userAgent.
  3. **Refactor:** consistent logging format.
- **Acceptance criteria:**
  - [ ] Every `/weighbridge/` API call logged (timestamp, service account, endpoint, status).
  - [ ] Sensitive fields never logged.
  - [ ] Audit log searchable by date, API key, endpoint, status.
  - [ ] Unit tests ≥80%; lint/typecheck clean.

---

## Epic 4.6 — Offline Fallback & Sync (Phase 4+, optional stub)

#### T-413. Offline queue stub (desktop app local SQLite)

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-408 (post-weighing endpoint finalized)
- **Files:**
  - `docs/WEIGHBRIDGE-OFFLINE-QUEUE.md` (create — design doc)
  - Desktop app code (out of scope; TPA vendor responsibility)
- **Steps:**
  1. **Design doc:** Specify offline queue semantics:
     - Desktop app queues weighings locally (SQLite) if network unavailable.
     - When online, sync queued items to POST /weighbridge/post-weighing with idempotency keys.
     - Conflict resolution (e.g., if server already has record with same key, skip).
  2. **API support:** Ensure idempotency keys work (T-410) to support retry-safe queuing.
  3. **Document:** Provide integration spec to TPA vendor (PT. Surveyor Indonesia).
- **Acceptance criteria:**
  - [ ] Design doc specifies offline queue semantics for desktop app.
  - [ ] Idempotency keys enable safe retry (T-410 complete).
  - [ ] Doc shared with TPA vendor.

---

## Epic 4.7 — Testing & Documentation (Size: M)

#### T-414. Weighbridge E2E test suite (Supertest)

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-406, T-408, T-411 (all endpoints complete)
- **Files:**
  - `apps/backend/test/weighbridge.e2e-spec.ts` (create/complete)
- **Steps:**
  1. **Test scenarios:**
     - Happy path: resolve-kitir by code, post-weighing with valid data → 200/201.
     - Happy path: resolve-kitir by plate.
     - Error cases: invalid code, expired kitir, gross < tare, missing TransactionDay, plate mismatch, invalid API key, rate limit exceeded.
     - Idempotency: post-weighing twice with same key → 201, 201 (not 409 conflict).
  2. **Setup:** spin up test DB, seed sample DisposalPermit, Vehicle, TransactionDay, Trip data.
  3. **Assertions:** verify Trip updated, TpaInboundLog inserted, response matches spec.
- **Acceptance criteria:**
  - [ ] E2E tests cover happy path + all error cases.
  - [ ] Idempotency test passes.
  - [ ] All tests ≥90% code coverage for weighbridge module.
  - [ ] Tests pass in CI (GitHub Actions).

#### T-415. Weighbridge API documentation & Swagger

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-406, T-408 (endpoints finalized)
- **Files:**
  - Swagger decorators in weighbridge.controller.ts (already via @ApiOperation, @ApiResponse, @ApiBody)
  - `docs/WEIGHBRIDGE-API.md` (create — human-readable reference)
- **Steps:**
  1. **Swagger:** Decorate endpoints with full descriptions, request/response examples, error codes.
  2. **Markdown doc:** endpoint list, authentication, request/response format, error handling, idempotency, rate limiting.
  3. **Share with TPA vendor:** provide /api/docs link + markdown doc.
- **Acceptance criteria:**
  - [ ] Swagger endpoint `/api/docs` documents all weighbridge endpoints.
  - [ ] Examples match spec (09-modules/integration-weighbridge.md).
  - [ ] Error codes documented (404, 409, 422, 429).
  - [ ] Markdown doc comprehensive.

#### T-416. Integration testing with TPA desktop app (staging)

- **Size:** M · **Coverage:** N/A
- **Depends on:** T-414 (E2E tests pass), T-415 (docs complete)
- **Files:**
  - `docs/WEIGHBRIDGE-STAGING-TEST-PLAN.md` (create)
- **Steps:**
  1. **Coordinate with TPA vendor:** provision test API key, deploy staging SWAT backend.
  2. **Test scenarios:**
     - Desktop app queries resolve-kitir (simulated or real).
     - Desktop app posts weighing with various payload sizes, frequencies.
     - Network latency + timeout scenarios.
     - Verify data integrity (no corruption, correct net weights).
  3. **Document findings:** any edge cases, performance issues.
- **Acceptance criteria:**
  - [ ] Test plan documented.
  - [ ] Staging test with TPA vendor completed (or scheduled).
  - [ ] API stable and ready for TPA integration.

---

## Epic 4.8 — Reconciliation (Phase 2 foundation)

#### T-417. TpaInboundLog reconciliation job (stub)

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-409 (TpaInboundLog ingestion working)
- **Files:**
  - `docs/RECONCILIATION-DESIGN.md` (create — design doc for Phase 2)
- **Steps:**
  1. **Design:**
     - Daily job (end-of-day): compare sum(DISPOSAL trips.netWeight) vs sum(TpaInboundLog.netWeight) for the day.
     - Flag discrepancies (>1% variance).
     - Logic: which records are missing? Weight differences?
  2. **Phase 2 implementation:** Full reconciliation + DailyTonnage aggregation.
  3. **Phase 4 scope:** Document design, prepare data schema for Phase 2.
- **Acceptance criteria:**
  - [ ] Design doc specifies reconciliation logic.
  - [ ] TpaInboundLog schema ready for reconciliation queries (indexes on date, tripId).
  - [ ] Ready for Phase 2 implementation.

---

## Exit Criteria (Phase 4)

**Phase 4 is complete when ALL of the following are verified:**

### Functional Requirements

- [ ] **Service account management:** Create, list, update, revoke service accounts via admin UI.
- [ ] **API key authentication:** Valid API key required for `/weighbridge/` endpoints; invalid/missing key → 401.
- [ ] **Resolve-kitir endpoint:** `POST /api/v1/weighbridge/resolve-kitir` returns vehicle details + tare weight + authorization; 404 for invalid/expired quota.
- [ ] **Post-weighing endpoint:** `POST /api/v1/weighbridge/post-weighing` creates/updates DISPOSAL trip, computes netWeight server-side, inserts TpaInboundLog; 422 if gross < tare.
- [ ] **Trip integration:** Weighing linked to Trip (via tripId FK in TpaInboundLog); Trip status = DONE after weighing posted.
- [ ] **Idempotency:** Repeated POST with same Idempotency-Key returns same response (no duplicates).
- [ ] **Rate limiting:** 500 requests/min per API key (configurable); 429 Too Many Requests when exceeded.
- [ ] **Audit logging:** All API calls logged (timestamp, serviceAccount, endpoint, status, IP).

### Testing & Quality

- [ ] **E2E tests:** ≥90% coverage of weighbridge module (happy path + all error cases).
- [ ] **Unit tests:** ≥85% coverage per service (resolution, validation, idempotency, rate limit).
- [ ] **Lint + typecheck:** `pnpm lint && pnpm typecheck` clean (0 errors, 0 warnings).
- [ ] **Integration tests:** weighbridge endpoints tested with realistic data (TransactionDay, DisposalPermit, Trip).

### Documentation & Integration

- [ ] **API documentation:** Swagger at `/api/docs` with all endpoints documented (descriptions, examples, error codes).
- [ ] **Integration spec:** WEIGHBRIDGE-API.md provided to TPA vendor.
- [ ] **Reconciliation design:** TpaInboundLog schema + design doc ready for Phase 2.
- [ ] **Offline queue design:** Design doc for desktop app offline SQLite queue.

### Data Integrity

- [ ] **Server-side net weight:** netWeight = gross - tare computed on server; never trusts client input.
- [ ] **TpaInboundLog reconciliation:** All weighings recorded in TpaInboundLog for Phase 2 reporting.
- [ ] **Idempotency working:** Duplicate POST requests with same key don't create duplicate records.

---

## Milestone

**End of Phase 4 — Weighbridge Integration Complete.** The TPA weighbridge desktop app can:

- Query vehicle authorization and tare weight (resolve-kitir).
- Post weighing results to SWAT backend.
- Retry safely with idempotency keys (no duplicates).
- Queue weighings offline and sync when online (desktop app feature).

SWAT records all weighings in Trip + TpaInboundLog. Tonnage is reconciled daily (Phase 2). System handles 1,000+ weighings per day with rate limiting and audit trails. Ready for production TPA integration.

---

## Task Summary (T-401 … T-417)

| Task ID | Epic | Title                                                | Size |
| ------- | ---- | ---------------------------------------------------- | ---- |
| T-401   | 4.1  | ServiceAccount entity & API key generation           | M    |
| T-402   | 4.1  | Service account CRUD endpoints (admin UI)            | M    |
| T-403   | 4.1  | API key authentication guard (middleware)            | M    |
| T-404   | 4.2  | DisposalPermit resolution service (by code or plate) | M    |
| T-405   | 4.2  | Weighing validation service (weights, tare, net)     | M    |
| T-406   | 4.3  | POST /api/v1/weighbridge/resolve-kitir endpoint      | M    |
| T-407   | 4.4  | Find or create DISPOSAL trip for weighing            | M    |
| T-408   | 4.4  | POST /api/v1/weighbridge/post-weighing endpoint      | L    |
| T-409   | 4.4  | TpaInboundLog insertion & audit trail                | M    |
| T-410   | 4.4  | Idempotency key support (optional header)            | S    |
| T-411   | 4.5  | Rate limiting per API key (middleware)               | S    |
| T-412   | 4.5  | API call audit logging                               | S    |
| T-413   | 4.6  | Offline queue stub (desktop app local SQLite)        | S    |
| T-414   | 4.7  | Weighbridge E2E test suite (Supertest)               | M    |
| T-415   | 4.7  | Weighbridge API documentation & Swagger              | S    |
| T-416   | 4.7  | Integration testing with TPA desktop app (staging)   | M    |
| T-417   | 4.8  | TpaInboundLog reconciliation job (stub)              | S    |

**Total tasks:** 17 | **Est. effort:** 2–3 weeks

---

**Next:** Execute tasks T-401 → T-417 in order, respecting dependencies and parallel groups. Refer to [`09-modules/integration-weighbridge.md`](../09-modules/integration-weighbridge.md), [`06-auth-rbac.md`](../06-auth-rbac.md), and Phase 1 endpoints for detailed requirements.
