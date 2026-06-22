# Phase 5 — Transaction Revamp · Verification

**Status:** ✅ Code-complete (2026-06-16). Built directly on `main`, commit-per-task.

Closes the gap-analysis findings G1 (ad-hoc trips), native-parity bits (bulk kitir, operator
attribution, kitir→trip link), G2 (trip photos), and D3 (TPA history backfill). G3 (general Excel trip
import) and D1/D2/D4/D5 were accepted as deferred.

## What shipped

| Task  | Deliverable                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-501 | `POST /trips` — record ad-hoc/unscheduled pickup/refuel/disposal trips (generalized `TripFinderService.createAdHocTrip`); web "Tambah rute tak terjadwal" dialog. Gated by `trip:create`.                                       |
| T-502 | `POST /disposal-permits/bulk-issue` (N kitir → printable codes); `post-weighing` `operatorId` → `Trip.recordedById` for service-account posts; `Trip.disposalPermitId` FK (raw-SQL partition migration) set in `post-weighing`. |
| T-503 | `GET`/`POST /trips/:id/photos` (legacy `dokumentasitrayek`) via the `Photo` model + MinIO presigned flow; web per-trip photo dialog (presign → PUT → register, SHA-256 checksum).                                               |
| T-504 | `migrate:backfill-tpa` — one-shot, idempotent, keyset-batched link of migrated `TpaInboundLog` rows to their DISPOSAL trips.                                                                                                    |
| T-505 | Spec sync (`transactions.md`, `integration-weighbridge.md`), Postman regen, full verification.                                                                                                                                  |

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

## Post-verification fixes & additions (manual UAT, 2026-06-17)

| Commit                                                                      | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fix(web): unwrap route params Promise on transaction-day detail (Next 16)` | The transaction-day detail page (`transaction-days/[id]/page.tsx`, a client component) read `params.id` synchronously. Under Next 16 `params` is a Promise, so `id` was `undefined` and reached the API as the string `"undefined"`, crashing `GET /transaction-days/:id` with a Prisma `invalid input syntax for type uuid` 500. Unwrapped with `React.use(params)`. It is the only dynamic client route.                                                                                                                                                                                                                                           |
| `fix(web): contain combobox search focus ring under Tailwind 4 layers`      | The global focus-visible ring in `globals.css` was unlayered CSS; under Tailwind 4's cascade layers an unlayered rule beats every layered utility regardless of specificity, so the combobox search input's `focus-visible:shadow-none` override (in `@layer utilities`) stopped winning and the green ring re-overflowed the popover. Moved the global ring into `@layer base` so per-component utilities win by layer order.                                                                                                                                                                                                                       |
| `feat(web): role-focused quick-entry screens for field recording`           | Restored the legacy per-role transaksi menus as focused single-task screens under `/record/{pickup,disposal,refuel,pool}` (legacy `pengambilansampah` / `pembuangansampah` / `pengisianbahanbakar` / `aktivitaspool`). Pick today's vehicle → record just that activity, no day→haul→trip navigation. Reuses `RecordTripDialog`/`AddTripDialog`; new "Pencatatan" nav group gated by `trip:update` (record) / `trip:create` (ad-hoc add). Gate is generic `trip:update`; per-category role scoping (e.g. `trip:pickup`) is a possible follow-up. **Gate re-run:** web typecheck + lint clean · 167 web tests green · `next build` OK (4 new routes). |

## UX revamp — naming + IA + form layout (manual UAT, 2026-06-17)

Follow-on UX pass driven during manual UAT. Frontend-only; **no backend/API/route-path changes** —
the REST surface (`/transaction-days`, `/haul-assignments/*`, …) is unchanged; only frontend slugs,
labels, and layout moved.

| Area                            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Penjadwalan**                 | Frontend route `transaction-days` → **`/scheduling`** (`git mv`), relabelled **"Penjadwalan"** (restores legacy `transaksi/penjadwalan`); breadcrumb + dashboard link + e2e updated. Backend API path stays `/transaction-days`.                                                                                                                                                                                                                                                                                                                                                    |
| **Pencatatan Aktivitas**        | The four `/record/{pickup,disposal,refuel,pool}` pages collapse into **one tabbed screen** at `/record` (`?tab=` synced, bookmarkable); nav group → single leaf under **Pengangkutan**. Each tab is a **per-day recap datagrid** (legacy-style `DataTable`) of all today's matching-category trips across the fleet — base cols (vehicle/driver/route/target/actual/odometer/status) + category cols (Volume / Bruto·Netto / Diminta·Disetujui) — with inline **Catat** on IN_PROGRESS rows and a toolbar vehicle-picker for ad-hoc add. Replaces the earlier vehicle-picker board. |
| **Refuel ledger**               | `/refuel-log` nav leaf moved from Pengangkutan into **Monitoring** and relabelled **"Riwayat & Biaya BBM"** / "Refuel Ledger" (it's a cost/anomaly history, not entry; legacy had fuel only as entry + monitoring + laporan). Route slug unchanged.                                                                                                                                                                                                                                                                                                                                 |
| **Terminology**                 | Removed **"Inisiasi Hari"** everywhere → **"Buat Jadwal Hari Ini"** / "Create Today's Schedule" (button, alert, toast, empty state, both locales).                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Combobox fix**                | The `Combobox` trigger's `w-full` (percentage) width didn't resolve in plain block flow (only inside grid cells / fixed-width wrappers), collapsing the vehicle picker to ~40px on the record screen. Gave it a **definite** width (`w-72 max-w-full`), matching the working `DatePicker` pattern.                                                                                                                                                                                                                                                                                  |
| **Modal forms → single column** | All modal/dialog field grids collapsed to one column (`grid gap-4 sm:grid-cols-2` → `grid gap-4`): `record-trip`, `reconcile`, `inspection`, `maintenance` dialogs. Non-form grids (photo gallery, read-only description list, time-picker, auth split) left intact; CRUD resource forms already single-column.                                                                                                                                                                                                                                                                     |
| **Dev DX**                      | `scripts/start.sh` gains an opt-in **`--clean`** (alias `--fresh`) flag that wipes `apps/web/.next` + `apps/backend/dist` before start — for use after adding/moving routes or `pnpm install`.                                                                                                                                                                                                                                                                                                                                                                                      |

**Gate re-run:** web typecheck clean · `eslint .` clean · `format:check` clean · **167** web tests green
(24 files). Data confirmed for the live demo day (2026-06-17: 12 hauls; 8 PICKUP / 9 DISPOSAL / 9 REFUEL
/ 11 pool trips), so the record tabs populate once a vehicle is picked.

## Exit criteria

- [x] Ad-hoc trips recordable for every route category (G1).
- [x] Native REST surface field-complete: bulk kitir, operator attribution, kitir→trip link.
- [x] Trip photos attach/list (G2).
- [x] Migrated TPA weighings linkable to trips (D3).
- [x] Specs + Postman in sync; full gate + e2e green; partition migration no-drift.

## Deferred / accepted (not Phase 5)

G3 general Excel trip import · D1 historical trip recorder · D2 historical verification audit ·
D4 dedup-null routes/templates · D5 vehicle↔source MIN heuristic.
