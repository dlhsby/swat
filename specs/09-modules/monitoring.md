# 09A — Monitoring Module (PHASE 2)

## Overview

The Monitoring module provides real-time operational dashboards for management and supervisory staff to track fleet performance, tonnage, fuel consumption, and route activity. It aggregates data from the transactional layer (Trip, HaulAssignment, FuelQuota) and external sources (TpaInboundLog, DailyTonnage) into visual KPI cards, charts, and drillable reports. This module is read-only; it supplies decision makers with current-day and historical trending data.

**Scope:** Dashboards only (data visualization). Reporting/export covered in Phase 3.

> **Legacy-parity notes (design-ready; build in Phase 2):**
> - **Source-type split (Total / Dinas / Swasta)** — legacy had separate tonnage dashboards for
>   government (`Dinas`) vs private (`Swasta`) sources (`monitoring/tonase`, `tonaseswasta`,
>   `tonasesemua`). In the new model these are **filters on `WasteSource.code`** (`D` = Dinas,
>   `S` = Swasta; see `01-glossary.md` §3), exposed as a **Total / Dinas / Swasta toggle** on the
>   "Volume per Hari" dashboard. No new entity required.
> - **Rekapitulasi / monthly disposal** (legacy `transaksi/rekapitulasi`, `pembuangansampahbulantahun`)
>   maps to the monthly tonnage aggregates here (Phase 2) + the report exports in Phase 3
>   (`reports.md`) — not a separate module.
> - **Charts:** build with **Recharts** using the prototype's data shapes; the dependency-free SVG
>   charts in `designs/.../prototype_src/charts.jsx` are the visual contract, not the implementation.

---

## Data Sources

### Primary aggregation sources

1. **Trip** — base transactional record
   - `netWeight` (kg): populated on DISPOSAL legs; aggregated for tonnage totals
   - `fuelApprovedLiters` (Decimal): populated on REFUEL legs; summed for consumption metrics
   - `status`: filtered to DONE/VERIFIED for reporting (in-progress trips excluded)
   - `actualTime`, `targetTime`: used for schedule variance analysis
   - `routeId` → Route → originSiteId / destinationSiteId (for geographic filtering)

2. **HaulAssignment** — daily crew & vehicle assignment
   - `departActualOdometer`, `returnActualOdometer`: odometer tracking per driver
   - `departActualTime`, `returnActualTime`: shift boundaries for fuel consumption per trip

3. **Haul** — vehicle-level daily work container
   - `vehicleId` → Vehicle → model, site; used to group trips per vehicle
   - `status`: marks completion of daily haul

4. **FuelQuota** — authorization & vessel identity
   - `vehicleId`, `siteId` (TPA): enables matching trips to quota/kitir
   - `validFrom`, `validTo`: tracks active quotas over date range

5. **TpaInboundLog** — external weighbridge ingest
   - `date`, `plateNumber`, `grossWeight`, `tareWeight`, `netWeight`: reconciliation source
   - Updated nightly from TPA desktop app; used for data quality checks

6. **DailyTonnage** — pre-aggregated daily total
   - `date` (unique): cached total tonnage per day = Σ netWeight(DISPOSAL, DONE|VERIFIED)
   - Materialized view or nightly batch; query-optimized for dashboard KPIs

7. **Site, Vehicle, Route, WasteSource** — dimension tables for filtering and drill-down

---

## User Stories

### For Management (Kepala Dinas / Pengawas)

- **US1:** As a manager, I want to see **total tonnage transported in the last 5 days** (rolling window), broken down by day, so I can quickly assess fleet health and plan pickups.
- **US2:** As a manager, I want **monthly tonnage trend** (current month vs. previous months), grouped by **waste source** (D/R/PS/PU/Swasta), so I can verify service coverage and optimize routing.
- **US3:** As a manager, I want to see **tonnage by TPS/site**, ranked, so I can identify high-volume areas and allocate vehicles accordingly.
- **US4:** As a manager, I want **fuel consumption dashboard**: requested vs. approved liters per vehicle/day, flagged if approved < requested, so I can monitor fuel anomalies and quota efficiency.
- **US5:** As a manager, I want **trip activity summary**: hauls completed, routes executed, vehicles in use, so I can verify operational tempo.
- **US6:** As a manager, I want **levy (retribusi) summary KPI** (total collected month-to-date, by category), so I can track revenue.

### For Supervisors (Kepala Bidang / Seksi Angkutan)

- **US7:** As a supervisor, I want to **drill down** from monthly tonnage to daily trends to individual trips, so I can investigate anomalies or verify completeness.
- **US8:** As a supervisor, I want **filter by date range** (datefrom/dateto) on all dashboards, so I can compare periods or isolate incidents.
- **US9:** As a supervisor, I want **vehicle-level fuel consumption** with actual fuel issued (fuelApprovedLiters) vs. requested, so I can spot fuel theft or documentation gaps.

---

## Screens & Reports

### Dashboard 1: Tonnage Overview (5-day + monthly)

**Layout:** KPI cards + line chart + table

- **KPI Cards (row 1):**
  - Total 5-day tonnage (kg or ton)
  - Total current-month tonnage (vs. previous month % change)
  - Hauls completed (count)
  - Average tonnage per haul (kg)

- **Chart (row 2):** Line chart (Recharts), last 5 days
  - X-axis: date
  - Y-axis: tonnage (kg)
  - Color: by waste source (D, R, PS, PU, Swasta) stacked area option

- **Table (row 3):** Daily summary, last 5 days
  - Columns: Date | Total tonnage | Haul count | TPA inbound (reconciliation check) | Status (✓ verified / ⚠ partial)

---

### Dashboard 2: Tonnage by Waste Source (Monthly breakdown)

**Layout:** Pie/bar chart + detail table

- **Chart:** Bar chart (Recharts), current month
  - X-axis: waste source (D, R, PS, PU, Swasta, Swasta-Private)
  - Y-axis: tonnage (kg)
  - Color per source
  - **Drill-down:** Click bar → filter all other dashboards to that source + date range

- **Table:** Waste source detail
  - Columns: Source | Tonnage | % of total | Haul count | Avg weight per haul

---

### Dashboard 3: Tonnage by TPS/Site (Top contributors)

**Layout:** Map + ranked table

- **Map (left):** Scatter plot (latitude/longitude of TPS locations)
  - Bubble size: proportional to total tonnage (last 5 days)
  - Tooltip: site name, tonnage, haul count
  - Click site → drill-down to site detail (show all routes, tonnage trend)

- **Table (right):** Top 15 TPS sites, ranked by tonnage (last 5 days)
  - Columns: Site name | Type (TPS/TPA) | Tonnage | Haul count | Last haul date | Fuel quota status (ACTIVE/INACTIVE)

---

### Dashboard 4: Fuel Consumption (By vehicle, by type)

**Layout:** KPI + comparison chart + vehicle table

- **KPI Cards:**
  - Total fuel approved (liters, current month)
  - Total fuel requested (liters, current month)
  - Request vs. approved ratio (%)
  - Avg fuel per haul (liters)

- **Chart:** Grouped bar chart (Recharts)
  - X-axis: vehicle (plate number, sorted by consumption)
  - Y-axis: fuel (liters)
  - Bars: requested (light) vs. approved (dark)
  - Color flag red if approved < requested by >5%

- **Table:** Vehicle fuel detail (current month)
  - Columns: Vehicle plate | Model | Fuel type | Requested (L) | Approved (L) | Variance | Status flag

---

### Dashboard 5: Route & Trip Activity

**Layout:** Activity summary cards + activity table

- **KPI Cards:**
  - Active routes (distinct routes with trips today)
  - Vehicles in operation (count, including planned + actual)
  - Trips completed (DONE/VERIFIED)
  - Trips in progress (IN_PROGRESS)

- **Table:** Daily trip summary (last 5 days, filterable by status)
  - Columns: Date | Trip | Route | Vehicle | Driver | Status | Tonnage (if DISPOSAL) | Time variance (actual − target) | Notes

---

### Dashboard 6: Levy Summary (Retribusi)

**Layout:** KPI + monthly trend chart + category table

- **KPI Cards:**
  - Total levy YTD (rupiah, formatted)
  - Total levy current month
  - Avg levy per category

- **Chart:** Line chart (Recharts)
  - X-axis: month (this year)
  - Y-axis: rupiah
  - Trend line overlay

- **Table:** Levy by category (current month)
  - Columns: Category | Amount | Avg per day | Count of transactions

---

## API Endpoints

### Monitoring (read-only, no mutations)

See [`07-api-spec.md`](../07-api-spec.md) for endpoint paths and response format details. Below is a mapping of monitoring operations:

| Method | Path | Permission | Response |
|--------|------|-----------|----------|
| GET | `/api/v1/monitoring/tonnage-5day` | `monitoring:read` | Σ tonnage per day, last 5 days |
| GET | `/api/v1/monitoring/tonnage-monthly` | `monitoring:read` | Σ tonnage per day, current month + previous 3 months |
| GET | `/api/v1/monitoring/tonnage-by-source` | `monitoring:read` | Σ tonnage by WasteSource code, date range |
| GET | `/api/v1/monitoring/tonnage-by-site` | `monitoring:read` | Σ tonnage by originSiteId (TPS), ranked, date range |
| GET | `/api/v1/monitoring/fuel-consumption` | `monitoring:read` | Σ fuel (requested, approved) per vehicle, date range |
| GET | `/api/v1/monitoring/fuel-by-type` | `monitoring:read` | Σ fuel by Fuel.name, date range |
| GET | `/api/v1/monitoring/routes-active` | `monitoring:read` | List of routes with ≥1 trip today |
| GET | `/api/v1/monitoring/trip-summary` | `monitoring:read` | Paginated trip list, filterable by date/status/route |
| GET | `/api/v1/monitoring/levy-summary` | `monitoring:read` | Σ levy by category, date range |
| GET | `/api/v1/monitoring/kpi-overview` | `monitoring:read` | Combined KPI object: 5-day tonnage, monthly trend, fuel, active vehicles, completed hauls |

**Query params (all endpoints accept):**
- `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` — filter by date range (required for most)
- `?wasteSourceId=<id>` or `?wasteSourceCode=<code>` — filter by source
- `?siteId=<id>` — filter by TPS or TPA
- `?vehicleId=<id>` — filter by vehicle
- `?page=1&limit=50` — pagination (for trip-summary)

**Response shape (example tonnage-5day):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-06-01",
      "totalTonnage": 45200,
      "haulCount": 12,
      "tpaInboundTonnage": 44800,
      "reconciliationStatus": "MATCHED"
    },
    {
      "date": "2026-06-02",
      "totalTonnage": 48100,
      "haulCount": 13,
      "tpaInboundTonnage": null,
      "reconciliationStatus": "PENDING"
    }
  ]
}
```

---

## Business Rules & Aggregations

### Tonnage Aggregation

**Formula (per date, per waste source, per site):**
```
Tonnage = Σ(Trip.netWeight) 
  WHERE Trip.status IN (DONE, VERIFIED) 
    AND Trip.route.category = DISPOSAL 
    AND Trip.operationDate = <date>
    AND [optional filters by Route.wasteSourceId, Route.originSiteId]
```

**Data quality checks:**
- If `HaulAssignment.returnActualTime IS NULL`, trip is still IN_PROGRESS; exclude from totals.
- If `Trip.netWeight = 0` (weighing not recorded), exclude from totals; log warning.
- Reconcile against `TpaInboundLog.netWeight` nightly; flag discrepancies >5% as anomalies.

### Fuel Consumption Aggregation

**Formula (per vehicle, per date, per fuel type):**
```
FuelApproved = Σ(Trip.fuelApprovedLiters)
  WHERE Trip.status IN (DONE, VERIFIED) 
    AND Trip.route.category = REFUEL
    AND Trip.operationDate = <date>
    AND Trip.haulAssignment.haul.vehicleId = <vehicleId>

FuelRequested = Σ(Trip.fuelRequestedLiters) [same filters]

VariancePercent = (FuelApproved / FuelRequested) * 100 - 100
  [negative = approved < requested]
```

**KPI:** Flag if VariancePercent < -5% (unapproved fuel request).

### Route Activity

**Definition:** A route is "active" if ≥1 trip with that route exists in the date range, status ≠ IN_PROGRESS.

```
ActiveRoutes = DISTINCT(Trip.routeId)
  WHERE Trip.status IN (DONE, VERIFIED)
    AND [date filter]
```

### Haul Completion

```
CompletedHauls = COUNT(Haul.id)
  WHERE Haul.status = DONE
    AND Haul.transactionDay.date = <date>

VehiclesInOperation = COUNT(DISTINCT Haul.vehicleId)
  WHERE [same filters]
```

---

## Performance & Caching

> **Canonical strategy:** [`../12-scalability-archiving.md`](../12-scalability-archiving.md) §2 (partitioning), §3 (archiving), §4 (rollups), and §5 (caching) is the **single source of truth** for:
> - Rollup table definitions and refresh strategies
> - Caching layers (HTTP, Redis, client-side)
> - Partitioning and archived data access patterns
> - TTL and invalidation patterns
> 
> **Monitoring reads rollup tables (current + archived) + Redis cache.** This section specifies monitoring-specific queries; all caching, archiving, and query optimization rules defer to doc 12. If any conflict arises, doc 12 wins.

### Materialized aggregates (rollup tables)

Monitoring queries **primarily** hit pre-aggregated rollup tables (doc 12 §4), never raw transactional history for standard dashboards:
- **DailyTonnage**: date-grained, updated nightly + on trip verify; spans all partitions
- **MonthlyTonnageBySource**: month × wasteSource, nightly batch
- **MonthlyTonnageBySite**: month × site (TPS/TPA), nightly batch
- **DailyFuelByVehicle** / **DailyFuelByFuelType**: date × vehicle/fuel, nightly batch
- **MonthlyRouteActivity**: month × route (trip counts), nightly batch

**Archived data access:** For historical reports (e.g., 2-year view), queries access archived partitions via partition-pruning; rollups are materialized on archived data as well per doc 12 §3.

All monitoring endpoints query these rollups first; drilling down into raw individual trips (via partitioned Trip table) is exception-based, not the norm.

### Cache layer (Redis)

Per doc 12 §5 **Dashboard KPIs / aggregates** layer:
- **Key pattern:** `monitoring:<metric>:<range>:<filters>` (e.g. `monitoring:tonnage-5day:2026-06-01_2026-06-05:all`)
- **TTL:** 15 minutes (current data); 1 hour (archived/historical)
- **Invalidation:** event-driven on trip verify (NestJS interceptor publishes `cache:invalidate:<dayKey>`); full refresh on nightly rollup job
- Reference data (sites, vehicles, fuels) cached separately with 1-hour TTL; invalidate on write.

### Query optimization

- Indexes on rollup tables: `DailyTonnage(date UNIQUE)`, `MonthlyTonnageBySource(month, sourceId)`, `MonthlyTonnageBySite(month, siteId)`.
- Partitioned tables (Trip, HaulAssignment, TpaInboundLog) use `operationDate` partition key + local indexes per doc 12 §2; partition-pruning on queries with date filters.
- Historic queries (>13 months) read from cold/archived partitions; rollups computed separately for archived data.

---

## Permissions

### Role: Management (Kepala Dinas, etc.)

- Permission: `monitoring:read`
- Access: All dashboards, date-range filters, no drill-down restrictions

### Role: Supervisor (Kepala Bidang, Kepala Seksi)

- Permission: `monitoring:read`
- Access: All dashboards, drill-down to trip level, view anomalies

### Role: Operator (Operator Pool, Petugas TPS/SPBU)

- Permission: None (no access to monitoring module)

---

## Acceptance Criteria

- [x] Tonnage dashboard displays 5-day and monthly totals, broken down by day and waste source.
- [x] Fuel consumption dashboard compares requested vs. approved, flags variances >5%.
- [x] Site-level tonnage displays top 15 TPS, ranked, with map visualization.
- [x] Drill-down from monthly to daily to trip level is functional.
- [x] Date-range filtering (dateFrom/dateTo) works on all endpoints.
- [x] KPI cards cached in Redis with TTL=15 minutes (per doc 12 §5); invalidate on trip verify.
- [x] TPA inbound reconciliation flagged on tonnage dashboard (< 5% mismatch = MATCHED).
- [x] All monitoring queries (rollups + cache) return within 1 second p95.
- [x] Levy summary dashboard shows monthly trend + category breakdown.
- [x] Read-only operations; no mutations in monitoring module.

---

## Test Cases

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T1 | 5-day tonnage aggregation | 10 DISPOSAL trips (5 days) with netWeight 5000 kg each | GET /monitoring/tonnage-5day | Response has 5 objects (one per day), each with totalTonnage = 10000 kg |
| T2 | Tonnage by waste source | 10 trips: 5× D, 5× R source | GET /monitoring/tonnage-by-source?dateFrom=2026-06-01&dateTo=2026-06-05 | Response has 2 objects: D=25000 kg, R=25000 kg |
| T3 | Fuel variance flagged | Haul has REFUEL trip: requested=100L, approved=80L | GET /monitoring/fuel-consumption | Response includes variance = -20%, flag = RED |
| T4 | Site drill-down | 3 TPS sites with 5, 8, 3 hauls respectively | GET /monitoring/tonnage-by-site?dateFrom=2026-06-01&dateTo=2026-06-05 | Response ordered by tonnage DESC; top site has 8 entries |
| T5 | Incomplete trip excluded | Trip with status=IN_PROGRESS, netWeight=5000 | GET /monitoring/tonnage-5day?dateFrom=2026-06-05&dateTo=2026-06-05 | Tonnage excludes this trip |
| T6 | TPA inbound reconciliation | Trip netWeight=4000 kg; TpaInboundLog netWeight=4200 kg (5% diff) | GET /monitoring/tonnage-5day | reconciliationStatus = "MATCHED" (within threshold) |
| T7 | Cache invalidation | KPI cached; new trip recorded | POST /trips/:id/verify + GET /monitoring/kpi-overview within 2 sec | Dashboard reflects new trip |
| T8 | Levy summary monthly | 5 levy records (May), 3 (June); amounts 500k, 600k, 700k (June) | GET /monitoring/levy-summary?dateFrom=2026-06-01&dateTo=2026-06-30 | June total = 1.8M IDR |
| T9 | Active routes count | 7 routes defined; 4 have DONE/VERIFIED trips today | GET /monitoring/routes-active?dateFrom=today&dateTo=today | Response count = 4 |
| T10 | Fuel by type aggregation | 5 REFUEL trips: 3× Premium (40L approved each), 2× Solar (50L each) | GET /monitoring/fuel-by-type | Response: Premium=120L, Solar=100L |
