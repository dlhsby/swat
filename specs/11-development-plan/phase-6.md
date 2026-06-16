# Phase 6 — Monitoring / Dashboard / Reporting Gap Analysis & Review

> **Stub.** This phase expands into turnkey epics/tasks (T-6xx) at its start. It mirrors the method
> used for the Phase 5 transaction gap analysis, applied to the monitoring/dashboard/reporting domain.

## Overview

Verify that **every legacy monitoring view and report has a faithful equivalent** in the new system,
list the gaps, then remediate. Legacy surface to audit (`old_swat/application/controllers/`):

- **Monitoring:** `monitoring/tonase*` (incl. `tonasesemua*`, `tonaseswasta`, `tonasesemua_b1_*`),
  `monitoring/bahanbakar`, `monitoring/rute*` (`rute`, `rute_swasta`, `rutesemua*`),
  `monitoring/retribusi`, `transaksi/aktivitaspool`, `transaksi/monitoringpengangkutansampah`.
- **Reports (laporan):** `laporan/tonase*`, `laporan/bahanbakar`.
- Legacy models: `model_monitoringtonasesampah*`, `model_monitoring_retribusi`, `model_laporantonasesampah`.

New surface to compare against: `apps/backend/src/modules/monitoring/**`, `modules/reports/**`,
`modules/analytics/**` (rollups), and the web `(app)/monitoring/*` + `reports` pages.

## Method (same as Phase 5)

1. **Inventory legacy** monitoring/report features: each view, its filters (date range, Swasta/
   Non-Swasta split, per-vehicle/route/source/site), columns, and computed values.
2. **Inventory new** dashboards/reports + the rollup tables that back them.
3. **Gap table:** legacy view → new equivalent (or MISSING) → field/filter-level gaps.
4. **Remediate** the confirmed gaps; **review** correctness of existing dashboards (rollup math,
   reconciliation status, timezone/date-boundary, archived-year inclusion).

## Candidate focus areas (confirm during analysis)

- Swasta / Non-Swasta / Semua ownership split parity (as-built derives from `WasteSource.code`).
- Per-source vehicle attribution (the MIN heuristic, D5) — revisit if monitoring depends on it.
- Report parity for any legacy report not yet covered by the Excel/PDF engine.
- Dashboard correctness review: rollup incremental vs nightly recompute drift, reconciliation badges.

## Exit Criteria

- [ ] Gap analysis doc complete (legacy↔new monitoring/report matrix).
- [ ] Confirmed gaps remediated or explicitly accepted/deferred with rationale.
- [ ] Dashboard/report correctness reviewed; specs + Postman in sync; full gate + e2e green.

**Next:** Phase 7 — Production deploy + legacy migration preparation.
