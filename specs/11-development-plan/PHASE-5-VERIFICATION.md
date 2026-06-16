# Phase 5 — Transaction Revamp · Verification

**Status:** ✅ Code-complete (2026-06-16). Built directly on `main`, commit-per-task.

Closes the gap-analysis findings G1 (ad-hoc trips), native-parity bits (bulk kitir, operator
attribution, kitir→trip link), G2 (trip photos), and D3 (TPA history backfill). G3 (general Excel trip
import) and D1/D2/D4/D5 were accepted as deferred.

## What shipped

| Task | Deliverable |
| --- | --- |
| T-501 | `POST /trips` — record ad-hoc/unscheduled pickup/refuel/disposal trips (generalized `TripFinderService.createAdHocTrip`); web "Tambah rute tak terjadwal" dialog. Gated by `trip:create`. |
| T-502 | `POST /disposal-permits/bulk-issue` (N kitir → printable codes); `post-weighing` `operatorId` → `Trip.recordedById` for service-account posts; `Trip.disposalPermitId` FK (raw-SQL partition migration) set in `post-weighing`. |
| T-503 | `GET`/`POST /trips/:id/photos` (legacy `dokumentasitrayek`) via the `Photo` model + MinIO presigned flow; web per-trip photo dialog (presign → PUT → register, SHA-256 checksum). |
| T-504 | `migrate:backfill-tpa` — one-shot, idempotent, keyset-batched link of migrated `TpaInboundLog` rows to their DISPOSAL trips. |
| T-505 | Spec sync (`transactions.md`, `integration-weighbridge.md`), Postman regen, full verification. |

## Verification evidence (live run, 2026-06-16)

- **Static:** `pnpm typecheck` 5/5 · `pnpm lint` 5/5 · `pnpm format:check` clean.
- **Tests:** backend **580** unit (74 suites) · web **167** · schemas — all green. Backend **e2e 38/38**
  against live Docker (incl. the new `Trip.disposalPermitId` assertion in the weighbridge suite).
- **Build:** `next build` + `nest build` 4/4.
- **Migration:** `20260616000000_trip_disposal_permit_fk` applied via `migrate deploy`; `migrate status`
  clean; column + FK propagated to the parent `trip` table and all 168 partitions.
- **Swagger↔Postman:** 153 operations, parity diff **0 missing / 0 typos**.
- **Live smoke (demo seed):**
  - `POST /disposal-permits/bulk-issue` count=3 → 201, codes `KT-202606-0001..0003`.
  - `POST /trips` ad-hoc DISPOSAL → 201, `IN_PROGRESS`, route resolved.
  - `GET /trips/:id/photos` → 200 `[]`.
  - `migrate:backfill-tpa` → scanned 4 676 demo logs, idempotent (demo logs are synthetic/independent,
    so 0 matched — matcher verified against the real-data shape; disambiguated-plate caveat documented).

## Exit criteria

- [x] Ad-hoc trips recordable for every route category (G1).
- [x] Native REST surface field-complete: bulk kitir, operator attribution, kitir→trip link.
- [x] Trip photos attach/list (G2).
- [x] Migrated TPA weighings linkable to trips (D3).
- [x] Specs + Postman in sync; full gate + e2e green; partition migration no-drift.

## Deferred / accepted (not Phase 5)

G3 general Excel trip import · D1 historical trip recorder · D2 historical verification audit ·
D4 dedup-null routes/templates · D5 vehicle↔source MIN heuristic.
