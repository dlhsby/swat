# Phase 2 — Monitoring & Analytics

## Goal
Provide operational dashboards and aggregated reporting for management and supervisors. Real-time KPI monitoring, historical trend analysis, and TPA reconciliation—all reading from pre-aggregated rollups and Redis cache so dashboards stay fast across all years (including archived data).

## Scope
- **Rollup layer:** Incremental + nightly jobs maintaining `DailyTonnage` and monthly summaries (by source/site/fuel/route) per [`12-scalability-archiving.md §4`](../12-scalability-archiving.md).
- **Aggregate caching:** Redis KPI cache with invalidation on trip-verify per [`12-scalability-archiving.md §5`](../12-scalability-archiving.md).
- **Monitoring API endpoints:** Read-only aggregates; date-range filtering; drill-down support (per [`09-modules/monitoring.md`](../09-modules/monitoring.md)).
- **Dashboards UI:** Next.js pages (`/monitoring/tonnage`, `/monitoring/fuel`, `/monitoring/routes`) with Recharts; KPI cards; filters; **work across all years** (read rollups).
- **TPA inbound log reconciliation:** Nightly match against trip data; flag discrepancies.
- **Archiving job:** Monthly detach of partitions older than 13-month window; `ArchiveCatalog`; re-attach support; verify dashboards unchanged after archiving.

## Dependencies
Phase 1 complete; transactional data populated; trip verification working; partitions in place from Phase 0 (T-014), rollup table schemas scaffolded in Phase 0 (T-026).

## Tasks

## Epic 2.1 — Rollup tables & incremental jobs (Size: L) [parallel-group: A]

#### T-201. Create rollup table schema (Size: M)
  - Depends on: Phase 0 (T-014 partitioning, T-026 rollup table scaffolding)
  - Files:
    - `apps/backend/prisma/schema.prisma` (modify) — add `DailyTonnage`, `MonthlyTonnageBySource`, `MonthlyTonnageBySite`, `DailyFuelByVehicle`, `MonthlyRouteActivity` models
    - `apps/backend/prisma/migrations/<timestamp>_add_rollup_tables.sql` (create) — DDL for rollup tables with indexes
  - Steps:
    1. Define Prisma models for all 5 rollup tables per [`12 §4`](../12-scalability-archiving.md):
       - `DailyTonnage { date UNIQUE, totalTonnageKg, haulCount, createdAt, updatedAt }`
       - `MonthlyTonnageBySource { yearMonth, wasteSourceId, totalTonnageKg, haulCount }`
       - `MonthlyTonnageBySite { yearMonth, originSiteId, totalTonnageKg, haulCount }`
       - `DailyFuelByVehicle { date, vehicleId, fuelApprovedLiters, fuelRequestedLiters }`
       - `MonthlyRouteActivity { yearMonth, routeId, tripCount }`
    2. Create raw SQL migration with:
       - Unique/composite indexes on each table
       - Partitions or CLUSTER hints for fast aggregations
       - Comment: "Rollup tables must be retained during archiving (doc 12 §3)"
    3. Test Prisma schema validity; run migration in dev.
    4. Seed a year of synthetic rollup data for dashboard testing.
  - Acceptance criteria:
    - [ ] All 5 rollup tables created with correct indexes
    - [ ] Prisma models compile without error
    - [ ] `pnpm prisma migrate dev` succeeds
    - [ ] Test data seeded; sample queries return in < 10ms

---

#### T-202. DailyTonnage incremental + nightly reconcile job (Size: L · Coverage: ≥85%)
  - Depends on: T-201, Phase 1 (trip verification working)
  - Files:
    - `apps/backend/src/modules/monitoring/daily-tonnage.service.ts` (create) — bulk of logic
    - `apps/backend/src/jobs/daily-tonnage.job.ts` (create) — `@nestjs/schedule` cron job
    - `apps/backend/src/modules/monitoring/daily-tonnage.repository.ts` (create) — raw SQL queries for aggregation
    - `apps/backend/test/daily-tonnage.service.spec.ts` (create) — unit tests
    - `apps/backend/test/daily-tonnage.job.e2e-spec.ts` (create) — integration test (cron trigger + DB verify)
  - Steps:
    1. **Incremental update on trip verify:**
       - Create a NestJS interceptor on `PUT /trips/:id/verify` endpoint
       - After trip transitions to VERIFIED, call `DailyTonnageService.updateForDate(operationDate)`
       - If trip is DISPOSAL: `netWeight` added to `DailyTonnage[date].totalTonnageKg`; increment `haulCount`
       - Query: `SELECT SUM(netWeight), COUNT(DISTINCT haulId) FROM Trip WHERE status=VERIFIED AND routeCategory=DISPOSAL AND operationDate=?`
       - Upsert to `DailyTonnage`; update `updatedAt`
    2. **Nightly reconcile job (11 PM / `@Cron('0 23 * * *')`):**
       - Logic: for each date in [today - 7 days, today], recompute `DailyTonnage` from scratch (to catch any stale incremental updates)
       - Idempotent: re-run safe
       - Also reconcile against `TpaInboundLog` for that date (see T-211)
       - Log counts matched/mismatched
       - Update `updatedAt` timestamp
    3. **Unit tests (TDD):**
       - Mock Prisma; test aggregation logic with various trip states
       - Test incremental upsert; verify `totalTonnageKg` and `haulCount` correct
       - Test nightly reconcile with gaps (missing trips, orphaned logs)
    4. **Integration test:**
       - Create test DB with known trip data
       - Create DISPOSAL trips, verify them
       - Trigger job manually (or sleep to cron time)
       - Assert `DailyTonnage` row exists with correct totals
       - Assert idempotency: re-run job, totals unchanged
  - Acceptance criteria:
    - [ ] Incremental update on trip verify: `DailyTonnage[date]` updated within 1s
    - [ ] Nightly job runs at 23:00 daily, recomputes trailing 7 days
    - [ ] Unit tests: ≥85% coverage (aggregation logic, reconcile, edge cases)
    - [ ] Integration test: end-to-end trip → verify → DailyTonnage populated correctly
    - [ ] `pnpm test` all DailyTonnage tests pass; lint+typecheck clean

---

#### T-203. Monthly rollups (by source, site, fuel, route) job (Size: L · Coverage: ≥80%)
  - Depends on: T-201, T-202 (DailyTonnage established)
  - Files:
    - `apps/backend/src/modules/monitoring/monthly-rollups.service.ts` (create)
    - `apps/backend/src/jobs/monthly-rollups.job.ts` (create) — `@Cron('15 23 * * *')` (after DailyTonnage at 11:15 PM)
    - `apps/backend/test/monthly-rollups.service.spec.ts` (create)
  - Steps:
    1. **Nightly batch (11:15 PM)** for each of the 4 rollup tables:
       - Recompute trailing 30 days (or this month if mid-month)
       - Aggregate from `Trip` + joins to `WasteSource`, `Route`, `Vehicle`, `Fuel`
       - Each rollup table rows by month × dimension:
         - `MonthlyTonnageBySource`: `GROUP BY YEAR(operationDate), MONTH(operationDate), wasteSourceId`
         - `MonthlyTonnageBySite`: `GROUP BY YEAR(operationDate), MONTH(operationDate), Route.originSiteId`
         - `DailyFuelByVehicle`: `GROUP BY operationDate, vehicleId` + SUM approved/requested liters
         - `MonthlyRouteActivity`: `GROUP BY YEAR(operationDate), MONTH(operationDate), routeId` + COUNT trips
       - Idempotent upsert (match on yearMonth + dimension keys)
    2. **Queries (sample):**
       ```sql
       SELECT 
         CONCAT(EXTRACT(YEAR FROM operationDate), LPAD(EXTRACT(MONTH FROM operationDate)::text, 2, '0')) AS yearMonth,
         Trip.wasteSourceId,
         SUM(Trip.netWeight) AS totalTonnageKg,
         COUNT(DISTINCT Trip.haulAssignmentId) AS haulCount
       FROM Trip
       WHERE Trip.status IN ('DONE', 'VERIFIED')
         AND Trip.routeCategory = 'DISPOSAL'
         AND operationDate >= ? AND operationDate < ?
       GROUP BY yearMonth, Trip.wasteSourceId
       ```
    3. **Unit + integration tests:**
       - Mock trip data (multi-source, multi-site)
       - Verify aggregations grouped correctly
       - Test idempotency: re-run, same totals
  - Acceptance criteria:
    - [ ] All 4 monthly rollup tables populated nightly with correct aggregations
    - [ ] `MonthlyTonnageBySource`, `MonthlyTonnageBySite` match legacy report totals (if data available)
    - [ ] Queries return < 100ms from partitioned/indexed tables
    - [ ] Coverage ≥80%; lint+typecheck clean
    - [ ] Log output confirms recompute completed successfully

---

## Epic 2.2 — Monitoring API endpoints (Size: M) [parallel-group: A]

#### T-204. Monitoring API: tonnage endpoints (Size: M · Coverage: ≥85%)
  - Depends on: T-202, T-203 (rollup tables populated)
  - Files:
    - `apps/backend/src/modules/monitoring/monitoring.controller.ts` (create)
    - `apps/backend/src/modules/monitoring/monitoring.service.ts` (create)
    - `apps/backend/src/modules/monitoring/monitoring.module.ts` (create)
    - `apps/backend/src/modules/monitoring/dto/tonnage-query.dto.ts` (create) — query params validation
    - `apps/backend/test/monitoring.e2e-spec.ts` (create) — endpoint tests
  - Steps:
    1. **Implement 4 tonnage endpoints** (per monitoring module in architecture spec):
       - `GET /api/v1/monitoring/tonnage-5day?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → array of `{ date, totalTonnageKg, haulCount }` from `DailyTonnage`
       - `GET /api/v1/monitoring/tonnage-monthly?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → monthly aggregates (roll-up of daily to months)
       - `GET /api/v1/monitoring/tonnage-by-source?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&wasteSourceId=...` → array of `{ wasteSourceId, name, totalTonnageKg, haulCount }` from `MonthlyTonnageBySource`
       - `GET /api/v1/monitoring/tonnage-by-site?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&siteId=...` → array of `{ siteId, name, totalTonnageKg, haulCount }` from `MonthlyTonnageBySite` (TPS/TPA sites only)
    2. **Query logic:**
       - Read from rollup tables (`DailyTonnage`, `MonthlyTonnageBySource`, etc.)
       - Cache in Redis with key `monitoring:tonnage:<range>:<filters>`, TTL 15 min
       - On cache miss, query DB + cache result
       - Support date-range `dateFrom`/`dateTo` params (required)
       - Optional filters: `wasteSourceId`, `siteId`, `vehicleId`
    3. **Validation:**
       - Zod schema for query params (dates in YYYY-MM-DD format, optional IDs are integers)
       - Return `400 Bad Request` if invalid
    4. **Response:**
       - `ApiResponse<TonnageEntry[]>` where `TonnageEntry = { date, totalTonnageKg, haulCount, tpaInboundTonnage?, reconciliationStatus? }`
       - Reconciliation status: if `TpaInboundLog.netWeight` exists for date, compute diff; if > 5%, flag as "DISCREPANCY"
    5. **Tests (TDD):**
       - Create test data: 10 DISPOSAL trips across 5 days with known tonnages
       - Test 5-day endpoint: response has 5 entries, totals match seeded data
       - Test monthly endpoint: aggregates correctly
       - Test cache: first call slower, second call < 1ms (from cache)
       - Test reconciliation: match TPA log where available
  - Acceptance criteria:
    - [ ] All 4 tonnage endpoints return correct aggregates
    - [ ] Response time < 100ms (cached) / < 1s (DB, uncached)
    - [ ] Date filtering works; invalid dates return 400
    - [ ] Reconciliation flag computed (>5% diff = DISCREPANCY)
    - [ ] Coverage ≥85%; lint+typecheck clean

---

#### T-205. Monitoring API: fuel & activity endpoints (Size: M · Coverage: ≥85%)
  - Depends on: T-202, T-203
  - Files:
    - `apps/backend/src/modules/monitoring/monitoring.service.ts` (modify) — add fuel/activity methods
    - `apps/backend/test/monitoring.e2e-spec.ts` (modify) — add fuel/activity tests
  - Steps:
    1. **Implement 5 fuel/activity endpoints:**
       - `GET /api/v1/monitoring/fuel-consumption?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&vehicleId=...` → array of `{ vehicleId, plateNumber, fuelApprovedLiters, fuelRequestedLiters, variancePercent }` (approved vs requested ratio)
       - `GET /api/v1/monitoring/fuel-by-type?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → array of `{ fuelId, fuelName, totalApprovedLiters, totalRequestedLiters }`
       - `GET /api/v1/monitoring/routes-active?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → array of `{ routeId, originSiteName, destinationSiteName, tripCount }` for routes with ≥1 DONE/VERIFIED trip
       - `GET /api/v1/monitoring/trip-summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&status=DONE&page=1&limit=50` → paginated trips with metadata (filter by status, status IN [IN_PROGRESS, DONE, VERIFIED])
       - `GET /api/v1/monitoring/kpi-overview?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → single object `{ tonnage5Day, tonnageMonthly, fuelApprovedMonthly, fuelRequestedMonthly, vehiclesInOperation, haulsCompleted, tripsRecorded }`
    2. **Fuel aggregation logic:**
       - Query `DailyFuelByVehicle` for approved/requested sums
       - Compute variance % = (approved / requested - 1) × 100
       - Flag RED if variance < -5%
    3. **Activity logic:**
       - `routes-active`: `DISTINCT Trip.routeId WHERE Trip.status IN (DONE, VERIFIED)`
       - `trip-summary`: full `Trip` rows with related `Route`, `Vehicle`, `HaulAssignment` data; pagination
       - `kpi-overview`: return single object with keys: `tonnage5Day`, `tonnageMonthly`, `fuelApprovedMonthly`, `fuelRequestedMonthly`, `vehiclesInOperation`, `haulsCompleted`
    4. **Caching:**
       - All endpoints cache at 15 min TTL
       - Invalidate on trip verify (update cache keys for that date)
    5. **Tests:**
       - Create REFUEL trips with known approved/requested liters
       - Test fuel endpoint: variance computed correctly
       - Test routes-active: count matches expected distinct routes
       - Test trip-summary: pagination works; filters by status work
       - Test KPI overview: returns aggregates for multiple metrics
  - Acceptance criteria:
    - [ ] All 5 endpoints return correct data
    - [ ] Fuel variance flagged correctly (RED if <-5%)
    - [ ] Routes-active count matches distinct routes with DONE/VERIFIED trips
    - [ ] Trip-summary pagination works (limit, offset)
    - [ ] KPI-overview returns combined metrics < 100ms from cache
    - [ ] Coverage ≥85%; lint+typecheck clean

---

#### T-206. Levy summary API endpoint (Size: S · Coverage: ≥80%)
  - Depends on: Phase 1 (Levy CRUD endpoints + data model in place)
  - Files:
    - `apps/backend/src/modules/monitoring/monitoring.service.ts` (modify) — add levy aggregation method
    - `apps/backend/test/monitoring.e2e-spec.ts` (modify) — add levy test
  - Steps:
    1. **Implement endpoint:**
       - `GET /api/v1/monitoring/levy-summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → array of `{ categoryId, categoryName, totalAmount, transactionCount, avgPerTransaction }`
       - Query: `SELECT categoryId, categoryName, SUM(amount) as totalAmount, COUNT(*) as transactionCount FROM Levy WHERE date BETWEEN ? AND ? GROUP BY categoryId`
       - All amounts in integer IDR
    2. **Caching:** Redis TTL 1 hour (levy less volatile than trip data); key: `monitoring:levy:<dateFrom>:<dateTo>`
    3. **Test:**
       - Create 10 levy records (5 category A, 5 category B, different amounts)
       - Verify aggregation correct; totals and counts match expected values
  - Acceptance criteria:
    - [ ] Levy endpoint returns correct totals and counts per category
    - [ ] Date filtering works (validates YYYY-MM-DD format)
    - [ ] Amounts in IDR (integers); calculations correct
    - [ ] Coverage ≥80%; lint+typecheck clean

---

## Epic 2.3 — Monitoring dashboards (Next.js UI) (Size: L) [parallel-group: B]

#### T-207. Dashboard layout & shell components (Size: M)
  - Depends on: Phase 1 (UI framework + layout done)
  - Files:
    - `apps/web/app/(admin)/monitoring/layout.tsx` (create) — nested layout for all monitoring routes
    - `apps/web/src/components/monitoring/kpi-card.tsx` (create) — reusable KPI card component
    - `apps/web/src/components/monitoring/date-range-picker.tsx` (create) — shared date filter control
    - `apps/web/src/components/monitoring/chart-skeleton.tsx` (create) — loading skeleton for charts
  - Steps:
    1. Create monitoring layout with:
       - Header: "Monitoring", user name, time last refreshed
       - Sidebar: navigation to 4 dashboard tabs (Tonnage, Fuel, Routes, Levy)
    2. KPI card component:
       - Props: `{ label, value, unit, trend, previousValue, isLoading }`
       - Show +/- % change vs previous period
       - Loading state with skeleton
    3. Date range picker:
       - Two date inputs (from/to) or preset buttons (Today, Last 7 days, This month, Last month, Year-to-date)
       - On change, fire callback to filter all dashboards
       - Store in URL query params
    4. Chart skeleton: loading animation (Recharts compatible)
  - Acceptance criteria:
    - [ ] Layout renders without error
    - [ ] KPI card displays value, unit, trend % correctly
    - [ ] Date picker updates URL query params
    - [ ] Responsive on mobile (sidebar collapses)

---

#### T-208. Tonnage dashboard (5-day + monthly) (Size: L · Coverage: ≥75%)
  - Depends on: T-204, T-207
  - Files:
    - `apps/web/app/(admin)/monitoring/tonnage/page.tsx` (create)
    - `apps/web/src/components/monitoring/tonnage-5day-chart.tsx` (create) — Recharts line chart
    - `apps/web/src/components/monitoring/tonnage-table.tsx` (create) — table widget
    - `apps/web/src/hooks/use-tonnage.ts` (create) — data fetching + caching (TanStack Query)
  - Steps:
    1. **Page layout:**
       - Row 1: 4 KPI cards (5-day total, monthly total, haul count, avg/haul)
       - Row 2: Line chart (Recharts) — X: date, Y: tonnage kg, color by waste source (stacked or legend)
       - Row 3: Table — date | total tonnage | haul count | TPA inbound | reconciliation status
    2. **Data fetching (TanStack Query):**
       - Hook `use tonnage()` with `{ dateFrom, dateTo, wasteSourceId? }`
       - Query: `GET /monitoring/tonnage-5day`, `GET /monitoring/tonnage-monthly`
       - Cache: `staleTime: 15 * 60 * 1000` (15 min), `gcTime: 1h`
       - On date change, refetch
    3. **Chart (Recharts):**
       - Data: array of `{ date, tonnage, source1, source2, ... }`
       - Composed area chart or bar + line
       - Tooltip: date, tonnage, source breakdown
       - Responsive: 100% width, 400px height
    4. **Table:**
       - Columns: date, totalTonnage, haulCount, tpaInbound, reconciliation (status badge)
       - Conditional color: RED if reconciliation = DISCREPANCY
       - Click row → drill-down detail modal (TBD Phase 2 extension)
    5. **Tests:**
       - Mock `use-tonnage` hook
       - Test KPI values render correctly
       - Test chart renders with data
       - Test date picker updates query and refetches
  - Acceptance criteria:
    - [ ] Tonnage dashboard renders 4 KPI cards with correct values
    - [ ] Line chart displays tonnage by date; legend shows waste sources
    - [ ] Table lists last 5 days with TPA reconciliation status
    - [ ] Date range picker updates all widgets
    - [ ] KPI values update within 1s (from cache) after date change
    - [ ] Responsive design (mobile-friendly)
    - [ ] Coverage ≥75% (UI heavy; full coverage overkill)

---

#### T-209. Fuel & routes dashboards (Size: M · Coverage: ≥75%)
  - Depends on: T-205, T-207
  - Files:
    - `apps/web/app/(admin)/monitoring/fuel/page.tsx` (create)
    - `apps/web/src/components/monitoring/fuel-comparison-chart.tsx` (create) — grouped bar chart (requested vs approved)
    - `apps/web/src/components/monitoring/fuel-table.tsx` (create)
    - `apps/web/app/(admin)/monitoring/routes/page.tsx` (create)
    - `apps/web/src/components/monitoring/routes-table.tsx` (create)
    - `apps/web/src/hooks/use-fuel.ts`, `use-routes.ts` (create)
  - Steps:
    1. **Fuel dashboard:**
       - Row 1: 4 KPI cards (total approved L, total requested L, request/approved %, avg/haul)
       - Row 2: Grouped bar chart — X: vehicle (plate), Y: liters, bars: requested (light) vs approved (dark)
         - Color bar RED if approved < requested by >5%
       - Row 3: Table — vehicle | model | fuel type | requested | approved | variance % | flag
       - Filters: by vehicle, by fuel type (dropdown)
    2. **Routes dashboard:**
       - Row 1: Activity summary KPIs (active routes, vehicles in operation, trips completed, in-progress)
       - Row 2: Routes table (from `routes-active` endpoint)
         - Columns: route (origin → destination) | category | distance km | frequency (trip count)
         - Sort by frequency DESC
         - Click row → drill-down to route detail (phase 2.5 stretch)
    3. **Data fetching:**
       - `use-fuel({ dateFrom, dateTo, vehicleId?, fuelTypeId? })`
       - `use-routes({ dateFrom, dateTo })`
    4. **Tests:**
       - Mock fuel + routes endpoints
       - Test KPI aggregations
       - Test chart renders; RED flag on variance
       - Test table filtering
  - Acceptance criteria:
    - [ ] Fuel dashboard: 4 KPIs, grouped bar chart (requested vs approved), variance flag RED
    - [ ] Routes dashboard: active routes count, vehicles in operation, routes table
    - [ ] Responsive layout on mobile
    - [ ] Date filtering updates all widgets
    - [ ] Coverage ≥75%

---

#### T-210. Levy summary dashboard (Size: S · Coverage: ≥70%)
  - Depends on: T-206, T-207
  - Files:
    - `apps/web/app/(admin)/monitoring/levy/page.tsx` (create)
    - `apps/web/src/components/monitoring/levy-chart.tsx` (create) — line chart (monthly trend)
    - `apps/web/src/components/monitoring/levy-table.tsx` (create)
    - `apps/web/src/hooks/use-levy.ts` (create)
  - Steps:
    1. **Levy dashboard:**
       - Row 1: 3 KPI cards (YTD total IDR, current-month total, avg per category)
       - Row 2: Line chart — X: month, Y: amount (IDR), overlay of 3 months
       - Row 3: Table — category | amount | transaction count | avg per transaction
    2. **Data:** `GET /monitoring/levy-summary` with date range
    3. **Chart formatting:** Y-axis with Rupiah format (e.g., "500K", "1.5M")
    4. **Test:**
       - Mock levy endpoint
       - Test KPI formatting (IDR displayed correctly)
       - Test chart renders
  - Acceptance criteria:
    - [ ] Levy dashboard renders KPIs in IDR format
    - [ ] Line chart shows monthly trend
    - [ ] Table grouped by category
    - [ ] Coverage ≥70%

---

## Epic 2.4 — TPA inbound log reconciliation (Size: M) [parallel-group: A]

#### T-211. TPA inbound reconciliation service (Size: M · Coverage: ≥85%)
  - Depends on: Phase 1 (TpaInboundLog ingestion)
  - Files:
    - `apps/backend/src/modules/monitoring/tpa-reconciliation.service.ts` (create)
    - `apps/backend/src/jobs/tpa-reconciliation.job.ts` (create) — runs after DailyTonnage job
    - `apps/backend/test/tpa-reconciliation.service.spec.ts` (create)
  - Steps:
    1. **Reconciliation logic (nightly job, 23:30, after DailyTonnage at 23:15):**
       - For each date in [today - 7, today]:
         - Query `DailyTonnage[date].totalTonnageKg` (sum of VERIFIED DISPOSAL trips)
         - Query `TpaInboundLog` for same date: `SUM(netWeight)` (from weighbridge)
         - Compute diff % = |(daily - tpa) / daily| × 100
         - If diff ≤ 5%, flag as "MATCHED"
         - If diff > 5%, flag as "DISCREPANCY"
         - Store result in `TpaReconciliation` table (or populate `DailyTonnage.reconciliationStatus` directly)
         - Log warnings for discrepancies (include date, counts, diff %)
    2. **Handle edge cases:**
       - If TpaInboundLog missing for date: "PENDING" status
       - If DailyTonnage missing: compute from scratch (should not happen, but defensive)
       - If both zero: "MATCHED" (no activity that day)
    3. **Report generation:**
       - At job end, emit log summary (how many matched, how many discrepancies, dates with issues)
    4. **Tests:**
       - Create scenarios: exact match, 3% diff (matched), 10% diff (discrepancy), missing TPA log
       - Verify reconciliation flags set correctly
  - Acceptance criteria:
    - [ ] Reconciliation job runs nightly after DailyTonnage
    - [ ] Matches trip tonnage against TpaInboundLog with 5% tolerance
    - [ ] Flags discrepancies in logs (no silent failures)
    - [ ] Coverage ≥85%; lint+typecheck clean

---

## Epic 2.5 — Archiving job & ArchiveCatalog (Size: XL) [parallel-group: A]

#### T-212. ArchiveCatalog table & schema setup (Size: M)
  - Depends on: Phase 0/1 (partitioning in place per [`12 §2`](../12-scalability-archiving.md))
  - Files:
    - `apps/backend/prisma/schema.prisma` (modify) — add `ArchiveCatalog` model
    - `apps/backend/prisma/migrations/<timestamp>_add_archive_catalog.sql` (create)
  - Steps:
    1. **ArchiveCatalog model:**
       ```prisma
       model ArchiveCatalog {
         id          BigInt
         tableName   String         // e.g., "trip_y2023m06"
         period      String         // e.g., "2023-06" (YYYY-MM)
         archiveType String         // e.g., "detached-partition" | "compressed"
         location    String         // file path or URL if external storage
         rowCount    BigInt
         sizeBytes   BigInt?
         checksum    String?        // SHA256 of archived data
         detachedAt  DateTime       @db.Timestamptz(6)
         reattachableUntil DateTime?  // Optional: when can't re-attach anymore
         notes       String?
         createdAt   DateTime       @default(now()) @db.Timestamptz(6)
         createdById Int?           // user who triggered archiving
         @@index([period])
         @@index([tableName])
       }
       ```
    2. Run migration: `pnpm prisma migrate dev`
    3. Create a seed for a test archive entry (year 2020)
  - Acceptance criteria:
    - [ ] ArchiveCatalog table created with indexes
    - [ ] Prisma model compiles
    - [ ] Test seed inserted

---

#### T-213. Archive job: detach, compress, catalog (Size: L · Coverage: ≥80%)
  - Depends on: T-212, T-202/T-203 (rollups complete)
  - Files:
    - `apps/backend/src/modules/archiving/archiving.service.ts` (create) — core logic
    - `apps/backend/src/jobs/archiving.job.ts` (create) — monthly cron job
    - `apps/backend/test/archiving.service.spec.ts` (create) — unit tests
    - `apps/backend/src/modules/archiving/archiving.module.ts` (create)
  - Steps:
    1. **Monthly job (`@Cron('0 1 1 * *')` = 1 AM first of month):**
       - Verify rollups for the period are complete (T-202/T-203 succeeded)
       - Identify partitions older than 13-month window (e.g., if today is June 2026, archive May 2025 and older)
       - For each partition to archive:
         a. **Detach:** `ALTER TABLE Trip DETACH PARTITION trip_y2025m05;`
         b. **Compress:** Dump partition to gzip: `pg_dump -t trip_y2025m05 | gzip > /archive/trip_y2025m05.sql.gz`
         c. **Checksum:** SHA256 of the gzipped file
         d. **Catalog:** Insert `ArchiveCatalog { tableName, period, archiveType='detached-partition', location, rowCount, sizeBytes, checksum, ... }`
         e. **Rename partition:** `ALTER TABLE trip_y2025m05 RENAME TO trip_y2025m05_archived;` (logical marker)
         f. Log completion per partition
    2. **Error handling:**
       - If rollups incomplete: abort (do not archive)
       - If detach fails: rollback (FK constraints safe)
       - If compression fails: log error, leave partition attached
       - Transactional: each partition is atomic
    3. **Idempotent:**
       - Check `ArchiveCatalog` before detaching; skip if already archived
    4. **Tests:**
       - Mock Postgres partition commands (or use test DB with a partition)
       - Test detach → compress → catalog flow
       - Test idempotency: re-run, no duplicate entries
       - Test error case: rollups incomplete → abort early
  - Acceptance criteria:
    - [ ] Archive job runs monthly (1st day at 1 AM)
    - [ ] Partitions older than 13 months detached + compressed + cataloged
    - [ ] ArchiveCatalog entries created with correct checksums
    - [ ] Job aborts if rollups incomplete (defensive)
    - [ ] Coverage ≥80%; lint+typecheck clean
    - [ ] Log output shows partitions archived + sizes

---

#### T-214. Re-attach + archive verification (Size: M · Coverage: ≥80%)
  - Depends on: T-213 (archiving job)
  - Files:
    - `apps/backend/src/modules/archiving/archiving.service.ts` (modify) — add re-attach methods
    - `apps/backend/src/modules/archiving/archiving.controller.ts` (create) — admin endpoints
    - `apps/backend/test/archiving.service.spec.ts` (modify) — re-attach tests
  - Steps:
    1. **Re-attach endpoint (admin only):**
       - `POST /api/v1/archiving/reattach` with `{ period, tableName }`
       - Look up `ArchiveCatalog` entry
       - Decompress archive file: `gunzip /archive/trip_y2025m05.sql.gz | psql swat`
       - Verify row count and checksum match
       - `ALTER TABLE Trip ATTACH PARTITION trip_y2025m05 FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');`
       - Rename back: `ALTER TABLE trip_y2025m05_archived RENAME TO trip_y2025m05;`
       - Update `ArchiveCatalog` entry: mark as `reattached`
       - Log success
    2. **Verification test (inline):**
       - After archiving: run `EXPLAIN ANALYZE` on a recent-date query (should not touch archived partition)
       - Run same query on an archived-date range (should re-attach transparently via FDW or explicit read)
       - Verify result set identical before/after archiving
    3. **Dashboard unchanged verification:**
       - After archiving, hit all monitoring dashboards with date ranges spanning archived periods
       - Assert same results (via rollups, not raw partitions)
       - Assert response time < 1s (cached)
  - Acceptance criteria:
    - [ ] Re-attach endpoint works; partition reconstructed correctly
    - [ ] Checksum verified before commit
    - [ ] Dashboards return same results after archiving (rollup integrity verified)
    - [ ] Query performance on archived period acceptable (< 1s from cache/rollups)
    - [ ] Coverage ≥80%

---

#### T-215. Archiving comprehensive test (integration + performance) (Size: M · Coverage: ≥75%)
  - Depends on: T-213, T-214
  - Files:
    - `apps/backend/test/archiving.integration-spec.ts` (create) — full archiving workflow
  - Steps:
    1. **Test DB setup:**
       - Create full year of trip data (2025) across 12 monthly partitions
       - Populate rollups for all 12 months
    2. **Archiving test:**
       - Trigger archive job manually for months 1–11 (keep month 12 hot)
       - Verify 11 partitions detached + compressed
       - Assert `ArchiveCatalog` has 11 entries
    3. **Dashboard test:**
       - Query monitoring dashboards for:
         - Current month (hot partition) — should be < 100ms
         - 3 months ago (warm partition) — should be < 500ms
         - 12 months ago (cold/archived, via rollups) — should be < 1s from cache
       - Assert results identical regardless of partition location
    4. **Re-attach test:**
       - Re-attach month 6
       - Query month 6 data again; assert matches previous query
       - Performance check
  - Acceptance criteria:
    - [ ] Full archiving workflow (detach → compress → catalog) succeeds
    - [ ] Rollups intact; no data loss
    - [ ] Dashboards unchanged by archiving
    - [ ] Re-attach restores partition and data integrity
    - [ ] Performance targets met (hot < 100ms, warm < 500ms, cold < 1s via cache)

---

## Epic 2.6 — Cache invalidation on trip operations (Size: S) [parallel-group: B]

#### T-216. Cache invalidation interceptor (Size: S · Coverage: ≥85%)
  - Depends on: T-204, T-205 (monitoring endpoints with Redis caching)
  - Files:
    - `apps/backend/src/common/interceptors/cache-invalidation.interceptor.ts` (create)
    - `apps/backend/test/cache-invalidation.spec.ts` (create) — unit test
  - Steps:
    1. **Interceptor logic:**
       - Applied to all trip mutation endpoints: `PUT /trips/:id/verify`, `PUT /trips/:id`, `POST /trips`
       - On success (response status 200), call `CacheService.invalidateForDate(operationDate)`
       - `CacheService.invalidateForDate(date)`:
         - Delete Redis keys matching `monitoring:tonnage:*`, `monitoring:fuel:*`, `monitoring:*:${date}:*`
         - Also increment a version counter `monitoring:dataVersion` for dashboard components to detect stale cache
    2. **Test:**
       - Mock Redis client
       - Verify correct keys deleted after trip verify
       - Verify old keys unaffected (from different dates)
  - Acceptance criteria:
    - [ ] Cache invalidated immediately after trip state change
    - [ ] Only affected date keys cleared (not all monitoring cache)
    - [ ] Coverage ≥85%

---

## Exit Criteria (Phase 2)

- [ ] All rollup tables (`DailyTonnage`, monthly summaries) populated and maintained by incremental + nightly jobs
- [ ] Monitoring API: 10 endpoints (`tonnage-5day`, `tonnage-monthly`, `tonnage-by-source`, `tonnage-by-site`, `fuel-consumption`, `fuel-by-type`, `routes-active`, `trip-summary`, `kpi-overview`, `levy-summary`) functional and tested (≥80% coverage)
- [ ] Dashboard UI: 4 pages (`/monitoring/tonnage`, `/monitoring/fuel`, `/monitoring/routes`, `/monitoring/levy`) render correctly with Recharts
- [ ] KPI cards display values, trends, units correctly; date filtering works across all dashboards
- [ ] TPA inbound reconciliation runs nightly; flags > 5% discrepancies
- [ ] All monitoring dashboards return < 1 second (via cache + rollups) for any date range, including archived years
- [ ] Archiving job: monthly detach of partitions >13 months old; compression; `ArchiveCatalog` entry created; rollups intact
- [ ] Re-attach endpoint works; archiving verified not to change any dashboard results
- [ ] Cache invalidation: trip verify triggers immediate invalidation of affected KPI keys
- [ ] Integration tests: full trip → verify → rollup update → dashboard refresh workflow passes
- [ ] Unit tests: ≥80% coverage across services; lint + typecheck clean
- [ ] Dashboards remain fast (<1s) and accurate after archiving tested partitions

## Task Summary (T-201 … T-216)

| Task ID | Epic | Title | Size |
|---------|------|-------|------|
| T-201 | 2.1 | Create rollup table schema | M |
| T-202 | 2.1 | DailyTonnage incremental + nightly reconcile job | L |
| T-203 | 2.1 | Monthly rollups (by source, site, fuel, route) job | L |
| T-204 | 2.2 | Monitoring API: tonnage endpoints | M |
| T-205 | 2.2 | Monitoring API: fuel & activity endpoints | M |
| T-206 | 2.2 | Levy summary API endpoint | S |
| T-207 | 2.3 | Dashboard layout & shell components | M |
| T-208 | 2.3 | Tonnage dashboard (5-day + monthly) | L |
| T-209 | 2.3 | Fuel & routes dashboards | M |
| T-210 | 2.3 | Levy summary dashboard | S |
| T-211 | 2.4 | TPA inbound reconciliation service | M |
| T-212 | 2.5 | ArchiveCatalog table & schema setup | M |
| T-213 | 2.5 | Archive job: detach, compress, catalog | L |
| T-214 | 2.5 | Re-attach + archive verification | M |
| T-215 | 2.5 | Archiving comprehensive test | M |
| T-216 | 2.6 | Cache invalidation interceptor | S |

**Total tasks:** 16 | **Est. effort:** 2–3 weeks

---

## Milestone
**End of Phase 2 — Monitoring & Analytics operational.** Management can view real-time and historical KPI dashboards. All data (hot/warm/cold) queried via rollups + cache. Archiving keeps operational DB lean. TPA reconciliation ongoing. System ready for Phase 3 (Reporting exports).
