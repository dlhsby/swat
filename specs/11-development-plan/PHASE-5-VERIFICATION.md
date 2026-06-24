# Phase 5 — Transaction Revamp · Verification

**Status:** ✅ Code-complete (2026-06-16; activity-record UX + CCTV modal + weighbridge/kitir
reconciliation refinements through 2026-06-24). Built directly on `main`, commit-per-task.

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

| Area                            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Penjadwalan**                 | Frontend route `transaction-days` → **`/scheduling`** (`git mv`), relabelled **"Penjadwalan"** (restores legacy `transaksi/penjadwalan`); breadcrumb + dashboard link + e2e updated. Backend API path stays `/transaction-days`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Pencatatan Aktivitas**        | One tabbed screen at `/record` (`?tab=` synced; order **pool · refuel · pickup · disposal**); nav group → single leaf under **Pengangkutan**. Each tab is the legacy **form-on-top + recap-grid-below** pattern: an entry form (Kendaraan/Waktu/Odometer + per-kind fields — pool leg, BBM liters, TPS, weights) and a grid of today's **DONE/VERIFIED** trips of that kind. Submit mirrors legacy: find the vehicle's scheduled trip (by TPS / pool leg / any-pending-refuel) and record it, else create an unscheduled trip for the typed TPS + record (pool = update-only). **Frontend-only** — composes existing `PUT /trips/:id` (record) + `POST /trips` (create), maps `routeId`→site via the routes master to match by TPS. Replaces the earlier datagrid+inline-Catat board. |
| **Refuel ledger**               | `/refuel-log` nav leaf moved from Pengangkutan into **Monitoring** and relabelled **"Riwayat & Biaya BBM"** / "Refuel Ledger" (it's a cost/anomaly history, not entry; legacy had fuel only as entry + monitoring + laporan). Route slug unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Terminology**                 | Removed **"Inisiasi Hari"** everywhere → **"Buat Jadwal Hari Ini"** / "Create Today's Schedule" (button, alert, toast, empty state, both locales).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Combobox fix**                | The `Combobox` trigger's `w-full` (percentage) width didn't resolve in plain block flow (only inside grid cells / fixed-width wrappers), collapsing the vehicle picker to ~40px on the record screen. Gave it a **definite** width (`w-72 max-w-full`), matching the working `DatePicker` pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Modal forms → single column** | All modal/dialog field grids collapsed to one column (`grid gap-4 sm:grid-cols-2` → `grid gap-4`): `record-trip`, `reconcile`, `inspection`, `maintenance` dialogs. Non-form grids (photo gallery, read-only description list, time-picker, auth split) left intact; CRUD resource forms already single-column.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Dev DX**                      | `scripts/start.sh` gains an opt-in **`--clean`** (alias `--fresh`) flag that wipes `apps/web/.next` + `apps/backend/dist` before start — for use after adding/moving routes or `pnpm install`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Gate re-run:** web typecheck clean · `eslint .` clean · `format:check` clean · **167** web tests green
(24 files). Data confirmed for the live demo day (2026-06-17: 12 hauls; 8 PICKUP / 9 DISPOSAL / 9 REFUEL
/ 11 pool trips), so the record tabs populate once a vehicle is picked.

## Activity-record refinements + CCTV modal + reconciliation (2026-06-24)

Frontend-led refinements plus one permission/spec fix; the REST surface is unchanged except the
`Petugas Timbang` grant. Commits this session (all pushed to `main`):

| Area | Change |
| --- | --- |
| **Recap grids (all kinds)** | **Tipe + Model** columns on every kind (after Nopol); Kendaraan picker labels `Nopol - Tipe - Model`; standardized order `No · Nopol · Tipe · Model · Pengemudi · …kind… · …measures… · [Odometer] · Tanggal · Waktu* · Keterangan · Status (hidden) · Aksi`; per-kind **Waktu** label (Aktivitas / Pengambilan / Pembuangan / Pengisian); export tables mirror the grid. Optional fields drop the "(opsional)" suffix → placeholder only. Edit dialog field order follows the grid. |
| **CCTV TPA image modal** | Disposal grid "CCTV TPA" cell is now a **"Lihat"** trigger opening the capture (`cctvReference`) in an image modal (legacy `dokumentasitrayek` lightbox parity) with a raw-reference fallback. New `CctvTpaCell` + unit tests. Demo seed attaches deterministic capture URLs + `trip_id` to the TPA weighbridge logs (same rows → reconciliation totals unchanged); existing demo DBs backfilled out of band. |
| **Weighbridge/kitir reconciliation** | Verified the new REST surface vs the legacy SOAP service — at/ahead of parity on every method. One gap closed: **Petugas Timbang** role gains `trip:update` so the bearer weighbridge operator can attach CCTV captures via `POST /trips/:id/photos` (legacy `uploadgambar`). Documented in `integration-weighbridge.md`. |
| **Spec + Postman sync** | `transactions.md §4` rewritten to the implemented routes (single `PUT /trips/:id` record, `DELETE /trips/:id` un-record, `/transaction-days/list`, trip photos; dropped the non-existent `/hauls` CRUD + `record-pickup/disposal/fuel` routes). Postman regenerated to 1:1 (155 operations); added the two missing requests; Login default fixed to `Password123!`; `host` default stays the project default `localhost:3000`. |

**Gate re-run:** web typecheck + lint + prettier clean · **170** web tests (24+1 files, incl. CctvTpaCell) ·
backend typecheck + 41 permission + 103 transactions/integrations tests green · Swagger live = **155
operations** = controllers · Postman parity diff 0.

---

## Manual check guide

A ~20-min hands-on walkthrough to confirm Phase 5 before sign-off. (Consolidated from the former
`PHASE-5-CHECK-GUIDE.md`.) Each item gives UI + API and what to expect.

### 0. Setup

From inner `swat/`: seed once (`pnpm db:seed`, idempotent) and start (`./scripts/start.sh`).
Ports come from `.env` (`BE_PORT` / web port) — **default 3000 / 3001**; this repo's `.env.local`
overrides to **4020 / 4021**. Use whichever your run prints.

- **Web:** `http://localhost:<web>/id-ID/login` → `admin / Password123!`
- **API:** `http://localhost:<be>/api/v1` · **Swagger:** `/api/docs`
- **Postman:** import the collection + env, set `host` to match `BE_PORT`, run **Auth → Login** first
  (the env already defaults to `admin / Password123!`).

```bash
B=http://localhost:4020/api/v1   # adjust to your BE_PORT
curl -s -X POST $B/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Password123!"}' -c /tmp/c.txt >/dev/null
```

### 1. Pencatatan Aktivitas (record + recap grids)

**UI:** sidebar **Pengangkutan → Pencatatan Aktivitas** (`/record`). Tabs: **Aktivitas Pool ·
Pengisian BBM · Pengambilan Sampah · Pembuangan Sampah** (`?tab=`). Pick a vehicle (options read
`Nopol - Tipe - Model`), fill the per-kind form (Waktu label changes per tab; Odometer optional), Simpan.
✅ Expect: the row drops into the recap grid below with columns `No · Nopol · Tipe · Model · Pengemudi ·
…kind… · …measures… · [Odometer] · Tanggal · Waktu · Keterangan · Aksi` (Status hidden by default).
The **Aksi** kebab offers **Ubah** (edit realization) and **Hapus** (un-record → row leaves the grid).
**Ekspor Laporan** downloads xlsx/pdf matching the grid. Without the kind's record permission the form
is hidden (grid still shows).

**CCTV TPA (disposal tab):** on a disposal row, click **Lihat** in the CCTV TPA column. ✅ Expect an
image modal of the capture (demo uses `picsum.photos`, so a real image online; raw-reference fallback
offline). Rows without a capture show "—".

**API (un-record):** `curl -s -b /tmp/c.txt -X DELETE $B/trips/<tripId>` → 200, trip back to
`IN_PROGRESS`, entered values cleared (category permission required; verified trip needs `trip:override`).

### 2. Ad-hoc trip · bulk kitir · operator attribution · kitir→trip link

- **Ad-hoc trip** — `POST /trips` `{ haulAssignmentId, category, destinationSiteId, name }` → 201
  `IN_PROGRESS`; omitting both `routeId` and `category`+`destinationSiteId` → 400; `trip:create` gated.
- **Bulk kitir** — Postman **Scheduling → Issue Kitir (bulk)** or `POST /disposal-permits/bulk-issue`
  `{vehicleId, siteId, validFrom, validTo, count:5}` → 201 array of 5 with distinct `KT-YYYYMM-NNNN`
  codes; `count > 200` → 400.
- **Operator attribution** — `POST /weighbridge/post-weighing` with `X-API-Key` + `operatorId` → the
  Trip's `recordedById` = that operator; a bad `operatorId` → **422** (not 500).
- **Kitir→trip link** — `SELECT id, disposal_permit_id FROM trip WHERE disposal_permit_id IS NOT NULL`
  shows links after any `post-weighing`; `prisma migrate status` clean (no partition drift).

### 3. Trip photos (G2) + weighbridge CCTV upload

`GET /trips/:id/photos` lists with presigned URLs; `POST /storage/presigned-put` then
`POST /trips/:id/photos` registers the object (`trip:update`). ✅ The **Petugas Timbang** role now holds
`trip:update`, so a bearer-authenticated weighbridge operator can attach the capture image (legacy
`uploadgambar`). A machine API-key principal reaches only `/weighbridge/*` and relies on `cctvReference`.

### 4. TPA backfill (D3) + Swagger/Postman parity

- `pnpm --filter @swat/backend run migrate:backfill-tpa` — idempotent; logs linked/unmatched counts.
  (Demo logs are synthetic; this matters after a real legacy load.)
- `curl -s http://localhost:<be>/api/docs-yaml | grep -c '^  /api/v1'` ≈ 155 operations; the Postman
  collection matches 1:1 (regenerate with `node apps/backend/postman/generate.mjs`).

---

## Exit criteria

- [x] Ad-hoc trips recordable for every route category (G1).
- [x] Native REST surface field-complete: bulk kitir, operator attribution, kitir→trip link.
- [x] Trip photos attach/list (G2).
- [x] Migrated TPA weighings linkable to trips (D3).
- [x] Activity-record UX (tabbed form + recap grids, CCTV image modal) shipped; weighbridge/kitir
      reconciled against the legacy SOAP service with no missing functionality.
- [x] Specs + Postman in sync (155 ops, 1:1); full gate + e2e green; partition migration no-drift.

## Deferred / accepted (not Phase 5)

G3 general Excel trip import · D1 historical trip recorder · D2 historical verification audit ·
D4 dedup-null routes/templates · D5 vehicle↔source MIN heuristic.
