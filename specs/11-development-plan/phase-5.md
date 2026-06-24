# Phase 5 — Transaction Revamp

## Overview

Close the remaining legacy-parity gaps in the transaction domain found by the gap analysis of
`old_swat/application/controllers/transaksi/*` and the NuSOAP native-app server
(`old_swat/application/controllers/Soapservers.php`) against the new NestJS/Prisma transactions stack.
The core daily workflow (auto-init, pool depart/return, disposal + weighbridge, verification, kitir,
levy, rollups, inspections) is already rebuilt and in places improved; this phase fills the specific
holes that can block real operations or the native-app cutover.

**Native apps = REST parity only.** There is no SOAP layer in the new system and none will be added;
repointing/rewriting the legacy .NET TPA-weighbridge and kitir-printing apps to REST is owned by their
maintainers. This phase makes the REST surface field-complete for them.

**In scope:** G1 ad-hoc trip recording · native-parity bits (bulk kitir issuance, operator
attribution, kitir→trip link) · G2 trip-photo attach · D3 TPA-history backfill.
**Deferred/accepted (not this phase):** G3 general Excel trip import · D1 lost trip recorder · D2 lost
verification audit · D4 dedup-null routes/templates · D5 vehicle↔source MIN heuristic.

**Effort:** 1–2 weeks. **Dependencies:** Phase 1 (transactions), Phase 4 (weighbridge) complete.

**Key deliverables:**
- `POST /trips` — record unscheduled pickup/refuel/disposal trips (legacy parity for ad-hoc activity).
- `POST /disposal-permits/bulk-issue` — issue N kitir in one call, returning printable codes.
- Operator attribution + kitir→trip link on weighings (legacy `petugasid` / `jatahKitir`).
- Per-trip photo attach/list (legacy `dokumentasitrayek`).
- One-shot backfill linking migrated `TpaInboundLog` rows to their `Trip`s.
- "Pencatatan Aktivitas" recording UX (tabbed form + recap grids, CCTV image modal) and a full
  weighbridge/kitir legacy-parity reconciliation (Epic 5.6, delivered during UAT).

---

## Epic 5.1 — Ad-hoc trip recording (Size: M)

#### T-501. Generalize trip-finder + `POST /trips`

- **Size:** M · **Coverage:** ≥90% (service)
- **Depends on:** Phase 1 (Trip/HaulAssignment), Phase 4 (`TripFinderService`)
- **Files:**
  - `apps/backend/src/modules/transactions/trip-finder.service.ts` (modify) — extract
    `createAdHocTrip(assignment, category, routeOrSiteId, actuals?)` from `findOrCreateDisposalTrip`
    (generalize the route-inference + partition-safe build for any `RouteCategory`).
  - `apps/backend/src/modules/transactions/trips/dto/create-trip.dto.ts` (create) —
    `{ haulAssignmentId, category, routeId? | destinationSiteId?, ...optional actuals }` (Zod/class-validator).
  - `apps/backend/src/modules/transactions/trips/trips.controller.ts` (modify) — `POST /trips`.
  - `apps/backend/src/modules/transactions/trips/trips.service.ts` (modify) — `create()` reusing the
    actuals validation in `record()` (odometer chain, gross≥tare, fuel-approval guard) + rollup refresh.
  - `apps/backend/src/modules/transactions/trips/trips.repository.ts` (modify) — partition-safe insert.
  - `apps/backend/src/common/auth/permission-catalog.*` (modify) + `prisma/seed.ts` — add `trip:create`.
  - `apps/web/src/app/[locale]/(app)/transaction-days/[id]/page.tsx` (modify) — "Tambah ritase tak
    terjadwal" dialog (category → route/site → optional actuals); inline field errors + submit toast.
  - `*.spec.ts` for trips + trip-finder.
- **Acceptance criteria:**
  - [ ] An operator can create an unscheduled PICKUP/REFUEL/DISPOSAL trip on an existing haul-assignment.
  - [ ] Created trip lands in the correct monthly partition (`operationDate` from the assignment).
  - [ ] Same validation as `record()`; rollups refresh; action audited; gated by `trip:create`.
  - [ ] tests pass; coverage ≥ 90%; lint+typecheck clean.

---

## Epic 5.2 — Native REST parity bits (Size: M)

#### T-502. Bulk kitir issuance, operator attribution, kitir→trip link

- **Size:** M · **Coverage:** ≥90% (service)
- **Depends on:** Phase 4 (weighbridge, disposal-permits)
- **Files:**
  - `apps/backend/src/modules/scheduling/disposal-permits/disposal-permits.controller.ts` +
    `disposal-permits.service.ts` (modify) — `POST /disposal-permits/bulk-issue`
    (`{vehicleId, siteId, validFrom, validTo, count}`) → N permits in one tx, returns an array of
    `{id, code, vehiclePlate, siteName, validFrom, validTo}` for client-side printing (legacy
    `insertJatahKitir`). New `BulkIssueDisposalPermitsDto`.
  - `apps/backend/src/modules/integrations/weighbridge/dto/post-weighing.dto.ts` (modify) — optional
    `operatorId`; `weighbridge.service.ts` (modify) — use it for `Trip.recordedById` when the principal
    is a ServiceAccount (legacy `petugasid`); populate the new `disposalPermitId` when a kitir resolves.
  - `apps/backend/prisma/schema.prisma` (modify) — nullable `disposalPermitId` FK on **Trip**.
  - `apps/backend/prisma/migrations/<ts>_trip_disposal_permit_fk/migration.sql` (create) — **raw-SQL
    `ALTER TABLE ... ADD COLUMN` applied via `prisma migrate deploy`** (Trip is a migration-managed
    monthly-partitioned table; `ADD COLUMN` on the parent propagates to partitions — **never `migrate dev`**).
  - `apps/backend/postman/generate.mjs` (modify) — add the 2 new endpoints; keep Swagger↔Postman 1:1.
  - `weighbridge.service.spec.ts`, disposal-permits service spec.
- **Acceptance criteria:**
  - [ ] `bulk-issue` creates N permits atomically and returns printable fields for all N.
  - [ ] A service-account weighing post can attribute a human operator via `operatorId`.
  - [ ] A resolved kitir is persisted as `Trip.disposalPermitId` (auditable historical link).
  - [ ] `prisma migrate status` clean (no partition drift); Postman regen, Swagger 1:1.
  - [ ] tests pass; coverage ≥ 90%; lint+typecheck clean.

---

## Epic 5.3 — Per-trip photo documentation (Size: S)

#### T-503. Trip photo attach + list

- **Size:** S · **Coverage:** ≥80%
- **Depends on:** Phase 0 (storage/MinIO), `Photo` model
- **Files:**
  - `apps/backend/src/modules/transactions/trips/trips.controller.ts` (modify) —
    `POST /trips/:id/photos` (presigned-put via `StorageService`, then register `Photo`
    `ownerType='trip', ownerId=tripId`) + `GET /trips/:id/photos`.
  - reuse `modules/storage` (`StorageService`) + the `Photo` model/service.
  - `apps/web/src/app/[locale]/(app)/transaction-days/[id]/page.tsx` (modify) — upload + thumbnail gallery.
  - service spec for the photo-registration path.
- **Acceptance criteria:**
  - [ ] A trip can have photos attached (presigned upload) and listed back with URLs.
  - [ ] Photos stored in MinIO (no bytes in PG); `Photo` rows polymorphic on `trip`.
  - [ ] tests pass; coverage ≥ 80%; lint+typecheck clean.

---

## Epic 5.4 — TPA-history backfill (Size: S)

#### T-504. Backfill `TpaInboundLog.tripId`

- **Size:** S · **Coverage:** ≥80% (matcher)
- **Depends on:** legacy transactional load (`migrate-legacy.ts --include-transactions`)
- **Files:**
  - `apps/backend/scripts/migration/backfill-tpa-trip-links.ts` (create) — match `TpaInboundLog`
    (date + plateNumber + gross/tare) → `Trip` (operationDate + vehicle plate + DISPOSAL + weights),
    set `tripId` via `tpa-inbound-log.service.ts` `updateByTripId`. Keyset-batched + watermarked +
    idempotent; log unmatched count.
  - `apps/backend/package.json` (modify) — `migrate:backfill-tpa` script.
- **Acceptance criteria:**
  - [ ] Migrated TPA logs get linked to their trips; re-running is a no-op (idempotent).
  - [ ] Unmatched rows reported (count + sample) for manual review.
  - [ ] Aligns historical data with the nightly `TpaReconciliationService` (sum compare).

---

## Epic 5.5 — Spec sync + verification (Size: S)

#### T-505. Docs, Postman, full gate

- **Files:** `specs/09-modules/transactions.md`, `specs/09-modules/integration-weighbridge.md`,
  `specs/11-development-plan/PHASE-5-VERIFICATION.md` (create); regenerate Postman.
- **Steps:** full gate from inner `swat/` — `pnpm typecheck && lint && format:check && build && test`,
  backend `test:e2e` against live Docker; reseed demo and smoke `POST /trips`,
  `POST /disposal-permits/bulk-issue`, `POST /trips/:id/photos`; run the D3 backfill on demo data.
- **Acceptance criteria:**
  - [ ] Swagger↔Postman parity diff = 0; specs updated; verification doc written.
  - [ ] Full monorepo gate + e2e green; partition migration shows no drift.

---

## Epic 5.6 — Activity-record UX + weighbridge/kitir reconciliation (delivered)

Follow-on work that landed under Phase 5 during manual UAT (frontend-led, plus one permission/spec fix).
Frontend-only except where noted — the REST surface is unchanged.

#### T-506. "Pencatatan Aktivitas" recording UX

- One tabbed screen at `/record` (**Aktivitas Pool · Pengisian BBM · Pengambilan Sampah · Pembuangan
  Sampah**), legacy form-on-top + recap-grid-below per kind. Submit finds the vehicle's scheduled trip
  (by TPS / pool leg / pending refuel) and records it, else creates an ad-hoc one then records.
- Recap grids: stable pinned **No.**, pinned-right **Aksi** kebab (Ubah / Hapus = soft un-record via
  `DELETE /trips/:id`), per-kind columns, **Tipe + Model** on every kind, per-kind **Waktu** label
  (Aktivitas/Pengambilan/Pembuangan/Pengisian), **Status** default-hidden, hidden audit columns,
  client-side **xlsx/pdf** export mirroring the grid. Odometer optional everywhere (placeholder, no
  asterisk); "speedometer" reworded to **odometer** in UI/DB/logic.
- **CCTV TPA** cell on the disposal grid opens the capture (`cctvReference`) in an **image modal**
  (legacy `dokumentasitrayek` screen-icon lightbox parity), with a raw-reference fallback. Demo seed now
  attaches deterministic capture URLs + `trip_id` to the TPA weighbridge logs so the modal has data.
- Kendaraan picker labels options **`Nopol - Tipe - Model`**; edit dialog field order mirrors the grid.

#### T-507. Weighbridge/kitir legacy reconciliation

- Verified the new REST surface against the legacy SOAP service (`Soapservers.php` + `webservice/server.php`):
  at or ahead of parity on every method (post/verify/correct weighing, list, bulk kitir, lookups subsumed
  by `resolve-kitir`, `login` → `/auth/token`). One gap closed: the bearer weighbridge operator (**Petugas
  Timbang** role) now carries `trip:update` so it can attach the CCTV capture via `POST /trips/:id/photos`
  (legacy `uploadgambar`); documented in `integration-weighbridge.md`.
- Spec + Postman re-synced to the live API (155 operations, Swagger↔Postman 1:1); added the
  previously-missing `GET /transaction-days/list` and `DELETE /trips/:id` requests; fixed the Postman
  Login default (`Password123!`).

---

## Exit Criteria

- [x] Ad-hoc trips recordable for every route category (G1 closed).
- [x] Native REST surface field-complete: bulk kitir, operator attribution, kitir→trip link (parity bits).
- [x] Trip photos attach/list (G2 closed); weighbridge operator can attach CCTV captures.
- [x] Migrated TPA weighings linkable to trips (D3 closed).
- [x] Activity-record UX revamp shipped; weighbridge/kitir reconciled against legacy (no missing functionality).
- [x] Specs + Postman in sync; full gate green; commits conventional, pushed.

**Next:** Phase 6 — Monitoring/dashboard/reporting gap analysis & review.
