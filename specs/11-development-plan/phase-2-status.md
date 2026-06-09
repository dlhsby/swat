# Phase 2 — Monitoring & Analytics · Implementation Status

**Status:** ✅ **CODE-COMPLETE** — all five milestones (**M0 Foundations**, **M1 Rollups + jobs**,
**M2 Monitoring API**, **M3 Dashboards**, **M4 Reconciliation + cache invalidation**, **M5
Archiving lifecycle**) complete and on `main` under green gates. The remaining items are the
operator's on-prem live steps (Docker stack up, `migrate deploy` + seed, real nightly cron, Redis
live cache, and the actual partition detach/compress/reattach run) — tracked in
[`PHASE-2-VERIFICATION.md`](./PHASE-2-VERIFICATION.md).

> Build-side progress record for [`phase-2.md`](./phase-2.md). Where this diverges from the spec,
> the divergence is intentional and flagged with a reason (the spec predates the build and drifts —
> see the Reconciliation Appendix in the implementation plan). Otherwise the spec is authoritative.

| | |
|---|---|
| **Spec** | [`phase-2.md`](./phase-2.md) (Epics 2.1–2.6, T-201…T-216) |
| **Module spec** | [`../09-modules/monitoring.md`](../09-modules/monitoring.md) |
| **Delivered** | M0 Foundations · M1 Rollups+jobs (2.1) · M2 Monitoring API (2.2) · M3 Dashboards (2.3) · M4 Reconciliation + cache-invalidation (2.4/2.6) · M5 Archiving (2.5) |
| **Commits** | `a8076a2` (M0 web foundations) · `d6b0994` (M1 rollup tables/jobs) · `f5da26b` (M2 read API) · `ea6a7a7` (M3 dashboards) · `042bc24` (M4 TPA reconcile + cache invalidation) · `3c145e2` (M5 archiving) · `2aed5f2` (review fixes — cache precision, KPI accuracy, dashboard tests) · `f1aefed` (6 individual waste sources, drop ownership) · `1931701` (DONE+VERIFIED tonnage parity) · `16b8051` (rollup backfill script) · `7c97da8` (seed vehicle→source) · `dff30c9` (vehicle waste-source UI) · `9905698` (by-source attribution limitation docs) — all on `main` |
| **Verified (CI/no-Docker)** | 2026-06-09 — backend **458 tests** pass; web **135 tests** pass; coverage **97.76 / 83.94 / 98.13 / 97.67** (gate 96/81/96/96 held); typecheck + lint green both apps |
| **Stack added** | `@tanstack/react-query` + `recharts` (web); `QueryClientProvider` in `(app)` layout |

---

## Milestone progress

| M | Scope | Status |
|---|-------|--------|
| **M0** | Foundations: deps, `QueryClientProvider`, MetricCard extract, i18n `monitoring` namespace, nav | ✅ Complete |
| **M1** | Epic 2.1 (T-201/202/203) — rollup tables promoted to Prisma models + augmented; incremental + nightly cron jobs | ✅ Complete |
| **M2** | Epic 2.2 (T-204/205/206) — 10 read-only monitoring endpoints, cached, `monitoring:read` guarded | ✅ Complete |
| **M3** | Epic 2.3 (T-207–210) — 4 dashboards (Volume, BBM, Routes, Levy) with Recharts | ✅ Complete |
| **M4a** | Epic 2.6 (T-216) — `CacheInvalidationInterceptor` on the trip record/verify routes, per-date precise | ✅ Complete |
| **M4b** | Epic 2.4 (T-211) — `TpaReconciliationService` + nightly cron, 5% tolerance | ✅ Complete |
| **M5** | Epic 2.5 (T-212–215) — `ArchiveCatalog` + archiving lifecycle (logic; live run operator-gated) | ✅ Complete |

---

## As-built deviations from `phase-2.md` (intentional)

1. **No `WasteSource.ownership` flag.** The plan (and `phase-2.md`) proposed an `ownership`
   DINAS/SWASTA column for the source toggle. **Reversed during the build:** the six codes
   (`D`/`R`/`PS`/`PU`/`PL`/`S`) are individual waste sources, not a two-way grouping. The toggle is
   derived from `WasteSource.code` at query time — `group=SWASTA` → code `S`, `group=NON_SWASTA` →
   the other five, omit for Semua. No stored flag, no migration. (`f1aefed`)

2. **Tonnage counts DONE **and** VERIFIED disposal trips**, not VERIFIED-only — matches legacy,
   which counts any realized disposal with `netWeight > 0`. Verified against 5503 live legacy trips
   (all DONE, zero VERIFIED): a VERIFIED-only filter would blank every dashboard. (`1931701`)

3. **By-source attribution is through the vehicle** (`VehicleWasteSource`), a **many-to-many**
   mapping (~1.5% of vehicles serve 2–5 sources). The rollup picks `MIN(wasteSourceId)` per vehicle
   so per-source totals still sum to the grand total. Known limitation, documented; exact fix
   (`Trip.wasteSourceId` at record time) deferred. See `monitoring.md` "Known Limitations". (`9905698`)

4. **Raw-SQL migrations + `migrate deploy`** everywhere — never `migrate dev` (partitioned-table
   constraint). The four raw rollup tables already existed and were promoted to Prisma models and
   augmented (`haulCount`, fuel approved/requested split) rather than re-created.

5. **Rollup backfill script** (`apps/backend/scripts/backfill-rollups.ts`, `pnpm rollup:backfill`)
   added so an operator can rebuild rollups idempotently from existing trip history on demand.

---

## Coverage / gates (as of 2026-06-09)

- Backend: `pnpm --filter @swat/backend run test:cov` → **97.76 / 83.94 / 98.13 / 97.67**
  (statements/branches/functions/lines), gate **96/81/96/96** held. 58 suites, 458 tests.
- Web: `pnpm --filter @swat/web run test` → 19 files, 135 tests, all green.
- `pnpm typecheck` + `pnpm lint` green across both apps.

Anything requiring a live stack (Redis cache hit/miss timing, nightly cron firing, partition
pruning `EXPLAIN`, real detach/compress/reattach, live levy data) is the operator's step — see
[`PHASE-2-VERIFICATION.md`](./PHASE-2-VERIFICATION.md).
