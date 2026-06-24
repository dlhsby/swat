# Phase 6 — Monitoring / Dashboard / Reporting Gap Analysis & Review

> **Status: delivered** (commit `818eb23`, `feat(monitoring): regroup into 4 domain pages, embed
> exports, add hauling map + range picker`). This document records the gap analysis against legacy
> and the remediation that shipped. Method mirrored the Phase 5 transaction gap analysis.

## Overview

Verify that **every legacy monitoring view and report has a faithful equivalent** in the new system,
list the gaps, then remediate. Legacy surface audited (`old_swat/application/controllers/`):

- **Monitoring:** `monitoring/tonase*` (incl. `tonasesemua*`, `tonaseswasta`, `tonasesemua_b1_*`),
  `monitoring/bahanbakar`, `monitoring/rute*` (`rute`, `rute_swasta`, `rutesemua*`),
  `monitoring/retribusi`, `transaksi/aktivitaspool`, `transaksi/monitoringpengangkutansampah`.
- **Reports (laporan):** `laporan/tonase*`, `laporan/bahanbakar`.
- Legacy models: `model_monitoringtonasesampah*`, `model_monitoring_retribusi`, `model_laporantonasesampah`.

New surface: `apps/backend/src/modules/monitoring/**`, `modules/reports/**`, `modules/analytics/**`
(rollups), and the web `(app)/monitoring/*` pages.

## Outcome — IA decision

Legacy scattered monitoring across ~10 controllers. Consolidated into **four domain "big pages"**, each
a tabbed screen with one shared date-range filter and an **embedded xlsx/pdf export** (the standalone
`/reports` hub was removed; the refuel ledger folded into Konsumsi BBM):

| # | Page (route) | Tabs |
|---|---|---|
| 1 | **Tonase Sampah** (`/monitoring/volume`) | Ringkasan (KPIs, daily + monthly trend, source donut, daily table w/ informational TPA total) · Per Sumber & TPS |
| 2 | **Konsumsi BBM** (`/monitoring/fuel`) | Ringkasan (requested-vs-approved + variance) · Per Jenis BBM · Riwayat Pengisian |
| 3 | **Pengangkutan** (`/monitoring/hauling`) | Peta (Google Maps) · Operasional (crew/vehicle/route + KM & time target-vs-actual) · Rekap |
| 4 | **Retribusi** (`/monitoring/levy`) | Ringkasan (by-category + monthly trend) · Data (CRUD) |

## Gap analysis (legacy → new)

| Legacy view | New equivalent | Status |
|---|---|---|
| `monitoring/tonase`, `tonasesemua`, `tonaseswasta` | Tonase Sampah — donut **Semua/Non-Swasta/Swasta** toggle (derives from `WasteSource.code`, `S`=Swasta) | ✅ parity |
| `laporan/tonase*` (Excel/PDF daily+monthly) | Embedded **Ekspor** → async report engine (5-sheet xlsx / pdf) | ✅ parity |
| `analisadata/tonasesumbersampah`, `tonasetps` | Tonase → *Per Sumber & TPS* recap tab | ✅ parity |
| `monitoring/bahanbakar` (gauge, by-type, filters) | Konsumsi BBM — KPIs, requested-vs-approved, **Per Jenis BBM** (was unused `fuel-by-type` endpoint), refuel ledger | ✅ core parity (legacy canvas gauge + week-of-month selector dropped — temporal covered by date-range presets) |
| `laporan/bahanbakar` (multi-sheet Excel) | Embedded **Ekspor** (4-sheet xlsx / pdf) | ✅ parity |
| `monitoring/rute*` (Google Maps route viz) | Pengangkutan → **Peta**: site markers + origin→destination route polylines, trip-weighted | ✅ parity (site/route viz; see *Deferred*) |
| `transaksi/monitoringpengangkutansampah`, `transaksi/rekapitulasi` | Pengangkutan → **Operasional** (driver/vehicle/route, KM & time target-vs-actual) + **Rekap** (route frequency) | ✅ parity |
| `monitoring/retribusi` (monthly) | Retribusi — by-category + monthly trend + CRUD | ✅ exceeds |
| `transaksi/aktivitaspool` | Pool legs are trips; surfaced in Pengangkutan Operasional + the activity-record screen | ✅ covered |

## Correctness review (existing dashboards)

- **Daily-tonnage `haul_count`** — raw query read `row.haulCount` from an un-aliased `haul_count`
  column → `undefined` → KPIs rendered `NaN`. Fixed (`"haul_count" AS "haulCount"`); `formatNumber`
  hardened to render `0` for non-finite input.
- **Date-range presets** — `last1m/3m/6m/1y` clamped to month length (a 31st no longer rolls forward).
- **Demo data freshness** — `SYNTHETIC_END` and the levy anchor now track the seed run date, so the
  default (today / YTD for levy) views are populated; synthetic trips carry KM + time so the
  Operasional tab has data.

## Tonnage data sources — weighbridge primary, activity record fallback

A late review corrected an earlier misconception about the two tonnage sources:

- **Weighbridge native-app POST** (`/weighbridge/post-weighing`) is the **primary** disposal capture.
  It finds/creates the DISPOSAL **Trip**, fills its gross/tare/net (`net = gross − tare`, server-side),
  marks it DONE/VERIFIED, **and** writes a linked `TpaInboundLog` row.
- **Manual activity record** (`PUT /trips/:id`) is the **fallback** when the native app/weighbridge is
  unavailable — it fills the same Trip but writes **no** `TpaInboundLog`.
- Both land in **`Trip.netWeight`**, the single canonical tonnage all dashboards read — the same
  "trip is canonical, weighbridge feeds it" pattern legacy used via its Excel sync into `trayek`.

### Reconciliation feature — REMOVED

A trip-vs-weighbridge reconciliation badge (`MATCHED/DISCREPANCY/PENDING`, 5% tolerance) + a nightly
`TpaReconciliationService` cron were briefly added (originally Phase-2 T-211). They were **removed**
because:
- **Legacy has no such feature.** Legacy's only "selisih" compares the day's tonnage to a *hardcoded
  1.2M kg target*; its weighbridge table (`sampahmasuktpa`, manual Excel only) was **merged into**
  `trayek`, never compared.
- Given the weighbridge POST writes **both** the Trip and the log from the same numbers, a
  "reconciliation" mostly re-measured weighbridge-fed trips; a gap really just meant "tonnage entered
  via the manual fallback / not yet weighed," not under-reporting.

The `TpaInboundLog` daily total is kept as an **informational column** on the tonnage dashboard.

## Backend changes

- `GET /monitoring/route-map` — active route edges + the coordinate-bearing sites they connect.
- `GET /monitoring/trip-summary` — now returns crew/vehicle/route + KM & time target-vs-actual; adds
  `vehicleId`/`driverId` filters.
- `fuel-by-type` surfaced (was implemented, unused). Specs (`07-api-spec.md` *), `09-modules/monitoring.md`)
  + Postman synced.

## Deliverables (T-6xx)

- **T-601** Nav → 4 domain pages; remove `/reports` + `refuel-log` leaves.
- **T-602** Reusable `<ExportMenu>` (async report engine) embedded per page.
- **T-603** Pengangkutan: Google-Maps `<HaulingMap>` + Operasional table + Rekap (backend `route-map`,
  extended `trip-summary`).
- **T-604** Konsumsi BBM: `fuel-by-type` + refuel-ledger fold-in.
- **T-605** Tonase: monthly trend, by-source/by-site recap, per-source **contrast colours**,
  **day/month delta** tooltips.
- **T-606** Shared popover date-range picker (two-month range calendar, presets, prev/next-day
  steppers, hover preview, today ring).
- **T-607** Correctness fixes (haul_count alias, preset day-clamp) + demo-seed freshness.
- **T-608** Spec + Postman sync.
- **T-609** Remove the trip-vs-weighbridge reconciliation badge + nightly `TpaReconciliationService`
  (not legacy behaviour); keep the `TpaInboundLog` daily total as an informational column.

## Deferred / accepted

- **Live vehicle GPS telemetry** — out of scope: no telemetry data source exists. The Pengangkutan
  map is site/route visualization from `Site.latitude/longitude`. Live tracking is the **Fleet GPS**
  phase (see Next).
- **Per-source vehicle attribution (MIN heuristic, D5)** — unchanged; known limitation, accepted.
- **`07-api-spec.md` monitoring rows** — staged with in-progress GPS spec edits in the working tree;
  to be committed alongside that work (the route-map/trip-summary additions are real and applied).
- Legacy fuel **gauge** widget + week-of-month selector — cosmetic/temporal; covered by date-range
  presets, not reproduced.

## Exit Criteria

- [x] Gap analysis doc complete (legacy↔new monitoring/report matrix — above).
- [x] Confirmed gaps remediated; non-gaps explicitly accepted/deferred with rationale.
- [x] Dashboard/report correctness reviewed; specs (module doc) + Postman in sync.
- [x] Full unit/integration gate green (web 172, backend 594), web production build green, manual
      walkthrough done. Live GPS deferred to the GPS phase.

**Next:** Phase 7 — Fleet GPS Tracking & Route-Deviation Monitoring.
