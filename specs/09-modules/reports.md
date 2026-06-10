# 09B — Reports Module (PHASE 3)

## Overview

The Reports module provides exportable, offline-ready reports in Excel and PDF formats, used for management review, auditing, and historical record-keeping. It replaces the legacy PHPExcel/FPDF controllers (`monitoring/tonase.php`, `laporan/*`) with modern server-side rendering (ExcelJS for .xlsx, pdfmake or Puppeteer for .pdf). Reports include tonnage trends, fuel consumption analysis, route summaries, and levy/retribusi transactions. The module also includes CRUD operations for Levy entity, which pairs with reporting.

**Scope:** Report generation (Excel/PDF export), Levy management, async job handling for large exports.

---

## Data Sources

### Reports aggregate the same sources as Monitoring (Phase 2)

1. **Trip** — per-leg transaction; DISPOSAL legs carry netWeight, REFUEL carry fuel liters
2. **HaulAssignment** — crew assignments; used for driver attribution in reports
3. **DailyTonnage** — pre-computed daily totals (materialized view)
4. **TpaInboundLog** — external weighbridge log; reconciliation check
5. **Vehicle, Site, Route, WasteSource** — dimensions (filtering, grouping)
6. **Levy** — retribusi master data and transactions

### New: Levy entity (stored in database)

Per [`03-data-model.md`](../03-data-model.md) §4 (Prisma schema), the Levy model is:

```prisma
model Levy {
  id           String       @id @db.Uuid @default(uuid(7))
  legacyId     BigInt?      @unique                      // For migration traceability
  categoryName String       @db.VarChar(100)             // Category label (e.g., "Retribusi Sampah", "Biaya Administratif")
  date         DateTime     @db.Date                     // Date of levy transaction
  amount       BigInt                                    // IDR (integer rupiah)
  notes        String?      @db.VarChar(256)             // Optional notes
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  createdById  String?                                   // FK to User
  updatedById  String?                                   // FK to User
  @@index([date])                                        // For reporting queries
  @@index([categoryName, date])                          // For levy by category over time
}
```

**Constraints:**
- Index on `(date)` — reporting queries (group by date, month).
- Index on `(categoryName, date)` — levy by category over time.

**Notes:** Levy is a master transaction record, stored as-is. No aggregation needed; reports query this table directly. Category names are stored as a string (`categoryName`) for flexibility; a separate `LevyCategory` lookup table can be added in a future refinement if structured data entry becomes needed.

---

## User Stories

### For Management (Kepala Dinas)

- **US1:** As a manager, I want **annual tonnage report** (by month, with YTD total), exported to Excel, so I can present performance to city leadership.
- **US2:** As a manager, I want **monthly tonnage report** (detailed by day, by waste source, by TPS), with summary sheet and pivot charts, so I can verify operational metrics.
- **US3:** As a manager, I want **fuel consumption report** (daily detail per vehicle, per fuel type), multi-sheet workbook (one sheet per fuel type + summary), so I can audit fuel expenses.
- **US4:** As a manager, I want **route summary report** (trips per route, frequency, distance, tonnage), sorted by frequency, so I can optimize network.
- **US5:** As a manager, I want **levy/retribusi report** (transactions by date/category, monthly totals, YTD), formatted with branding (header, footer, colors), so I can track revenue collection.

### For Supervisors (Kepala Bidang)

- **US6:** As a supervisor, I want to **export reports as PDF** (in addition to Excel) for archival and email distribution.
- **US7:** As a supervisor, I want **report generation to be asynchronous** (submit, get job ID, poll for status, download when ready) so I don't block the UI on large date ranges.
- **US8:** As a supervisor, I want **automatic email delivery** of monthly reports (levy summary, tonnage) to department heads.

### For Admin / Operators

- **US9:** As an admin, I want to **manage levy entries** (create, read, update, delete) so we can record fee transactions and track revenue.

---

## Screens & Reports

### Report 1: Tonnage Report (Annual / Monthly / Custom)

**Format:** Excel (.xlsx) + PDF optional

**Structure (Excel):**

1. **Sheet 1: Summary** — Header with DLH logo, "Laporan Tonase Pengangkutan Sampah", date range. Table: Month | Total Tonnage (kg) | Haul Count | Avg Tonnage/Haul | Trend (%). Footer: Grand total, YTD total.

2. **Sheet 2: By Day (detailed)** — Date | Tonnage | Haul count | TPS count | Reconciliation status. Conditional formatting: red if TPA inbound mismatch >5%.

3. **Sheet 3: By Waste Source** — Waste source (D, R, PS, PU, Swasta) | Total tonnage | % of total | Haul count | Avg per haul. Colors one per source; pie chart embed.

4. **Sheet 4: By TPS (top 20)** — Rank | TPS name | Tonnage | Haul count | Avg weight | Last haul date. Subtotal row at bottom.

5. **Sheet 5: Summary statistics** — Min/max/avg tonnage per day, busiest/slowest day, most-served TPS.

**PDF variant:** Combines sheets 1–3 into single paginated PDF (via pdfmake or Puppeteer).

---

### Report 2: Fuel Consumption Report (Daily / Monthly)

**Format:** Excel (.xlsx), multi-sheet

**Structure:**

1. **Sheet 1: Summary** — Header "Laporan Konsumsi Bahan Bakar", period. KPI: Total fuel approved (L) | Total requested (L) | Avg variance (%) | Total cost (IDR, from fuel price × liters).

2. **Sheet 2: By Vehicle (daily pivot)** — Date | Vehicle (plate) | Model | Fuel type | Approved (L) | Requested (L) | Variance (%) | Cost (IDR). Sort by vehicle then date; subtotal per vehicle.

3. **Sheets 3+: By Fuel Type** — One sheet per fuel type (Premium, Pertamax, Solar, etc.). Columns: Date | Vehicle | Liters approved | Cost. Subtotal per date, grand total at end.

4. **Sheet final: Variance Analysis** — Flags entries where approved < requested by >5%. Columns: Date | Vehicle | Fuel type | Requested | Approved | Variance (%) | Flag reason.

---

### Report 3: Route Summary Report

**Format:** Excel (.xlsx)

**Structure:**

1. **Sheet 1: Route frequency** — Rank | Route (origin → destination) | Category (PICKUP/DISPOSAL) | Distance (km) | Frequency (# trips) | Total tonnage | Avg tonnage per trip.

2. **Sheet 2: Route performance** — Route | Planned time (target) | Actual avg time | Time variance (%) | Vehicles used | Drivers used.

---

### Report 4: Levy / Retribusi Report

**Format:** Excel (.xlsx) + PDF

**Structure (Excel):**

1. **Sheet 1: Monthly Summary** — Header "Laporan Retribusi Pengangkutan Sampah". Table: Month | Category | Amount (IDR) | Count of transactions | Avg per transaction. Footer: Grand total IDR, count, YTD total.

2. **Sheet 2: Daily Detail** — Date | Category | Amount | Count. Subtotal per day.

3. **Sheet 3: By Category (pivot)** — Category name | YTD total | Jan | Feb | ... | Dec (monthly columns).

**PDF variant:** Single-page summary (month, category totals, signature block for approval).

---

## Levy Management (CRUD)

### Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/api/v1/levies` | `levy:read` | List levies (filter: date range, categoryId; paginated) |
| GET | `/api/v1/levies/:id` | `levy:read` | Get levy detail |
| POST | `/api/v1/levies` | `levy:create` | Create levy entry (date, categoryId or categoryName, amount, notes) |
| PATCH | `/api/v1/levies/:id` | `levy:update` | Update levy (categoryId, amount, notes) |
| DELETE | `/api/v1/levies/:id` | `levy:delete` | Delete levy entry |

---

## Report Generation API

### Async Report Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| POST | `/api/v1/reports/tonnage/generate` | `report:generate` | Submit tonnage report; returns jobId |
| POST | `/api/v1/reports/fuel/generate` | `report:generate` | Submit fuel report; returns jobId |
| POST | `/api/v1/reports/route/generate` | `report:generate` | Submit route report; returns jobId |
| POST | `/api/v1/reports/levy/generate` | `report:generate` | Submit levy report; returns jobId |
| GET | `/api/v1/reports/jobs/:jobId` | `report:generate` | Poll job status (QUEUED, PROCESSING, COMPLETED, FAILED) |
| GET | `/api/v1/reports/download/:jobId` | `report:generate` | Download completed report |
| DELETE | `/api/v1/reports/jobs/:jobId` | `report:generate` | Cancel queued job or delete file |

**Request body:**
```json
{
  "dateFrom": "2026-01-01",
  "dateTo": "2026-12-31",
  "format": "xlsx",  // or "pdf"
  "wasteSourceId": null,  // optional
  "siteId": null          // optional
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid-1234",
    "reportType": "tonnage",
    "status": "QUEUED",
    "estimatedCompletionAt": "2026-06-05T14:35:00Z"
  }
}
```

---

## Report Engine: Implementation

### Technology

1. **Excel (.xlsx):** ExcelJS library. Multi-sheet workbooks, styled headers, formulas for totals (not hardcoded), embedded charts.

2. **PDF:** pdfmake (lightweight, hardcoded layouts) for simple reports (levy, fuel summary); Puppeteer (HTML→PDF) for rich-layout reports (tonnage with charts).

### Branding & templating

- **Header:** DLH logo (S3 or base64), "Dinas Lingkungan Hidup Kota Surabaya"
- **Footer:** Page number, "Generated: <timestamp>", department name
- **Colors:** RGB(0, 102, 51) headings (DLH brand), alternating row shades
- **Dates:** "Laporan Periode <dateFrom> s/d <dateTo>"

### Async job handling (BullMQ + Redis)

1. `POST /reports/*/generate` → validate user permission, insert `ReportJob` (QUEUED), enqueue in BullMQ, return `jobId`
2. Worker pool (2–3 workers) pulls jobs from queue, updates job status = PROCESSING
3. Worker generates file (via ExcelJS / pdfmake / Puppeteer), uploads to S3, updates job (COMPLETED)
4. On error: status = FAILED, error message logged to DB
5. `GET /reports/download/<jobId>` streams from S3 (pre-signed URL or CDN)
6. Cleanup: S3 lifecycle rules delete files after 7 days; optionally prune `ReportJob` records from DB after archive

**ReportJob table:**
```prisma
model ReportJob {
  id            String    @id @default(uuid())        // UUID
  userId        Int                                    // User who requested
  reportType    String                                 // 'tonnage' | 'fuel' | 'route' | 'levy'
  format        String                                 // 'xlsx' | 'pdf'
  status        String                                 // QUEUED | PROCESSING | COMPLETED | FAILED
  filters       Json?                                  // { dateFrom, dateTo, wasteSourceId?, siteId?, ... }
  fileUrl       String?                                // S3 object key (not full URL; pre-signed on demand)
  fileSize      BigInt?                                // bytes
  errorMessage  String?                                // if FAILED
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
  expiresAt     DateTime?                              // 7 days from completedAt
}
```

---

## Business Rules & Aggregations

### Tonnage aggregation
```
Total = Σ(netWeight)
  WHERE Trip.status IN (DONE, VERIFIED)
    AND Trip.route.category = DISPOSAL
    AND date BETWEEN dateFrom AND dateTo
    AND [optional filters: wasteSourceId, siteId]

By source = GROUP BY WasteSource.code, SUM(netWeight)
By TPS = GROUP BY Route.originSiteId, SUM(netWeight)
```

### Fuel aggregation
```
Approved per vehicle/day = Σ(fuelApprovedLiters)
  WHERE Trip.route.category = REFUEL

Cost = fuelApprovedLiters × Fuel.pricePerLiter [per trip]
```

### Route aggregation
```
Frequency = COUNT(DISTINCT Trip.id) WHERE Trip.routeId = <rid>
Total tonnage = Σ(netWeight) [DISPOSAL legs on route]
Avg time = AVG(actualTime - targetTime)
```

### Levy aggregation
```
Monthly total = Σ(amount)
  WHERE Levy.categoryId = <cid>
    AND MONTH(Levy.date) = <month>
    AND YEAR = <year>

YTD total = Σ(amount) WHERE YEAR = current year
```

---

## Performance & Optimization

> **Canonical strategy:** [`../12-scalability-archiving.md`](../12-scalability-archiving.md) §2 (partitioning), §3 (archiving), §4 (rollups), §5 (caching), §6 (object storage) is the **single source of truth** for:
> - Rollup table definitions and refresh strategies
> - Caching layers (HTTP, Redis, client-side)
> - Partitioning and archived data access patterns
> - Object storage for report artifacts (`swat-reports` bucket)
> - TTL (7 days for reports) and invalidation patterns
> 
> **Reports query rollup tables (current + archived) by default; drill into raw partitions only on demand.** This section specifies report structures and generation logic; all archiving, partitioning, caching, and storage rules defer to doc 12. If any conflict arises, doc 12 wins.

### Pre-aggregation (rollup tables)

Reports query rollup tables from doc 12 §4 (spanning both current and archived partitions):
- **DailyTonnage**, **MonthlyTonnageBySource**, **MonthlyTonnageBySite**: for tonnage reports
- **DailyFuelByVehicle**, **DailyFuelByFuelType**: for fuel consumption reports
- **MonthlyRouteActivity**: for route reports
- **Levy**: for levy/retribusi reports (stored table, not aggregated)

**Archived data:** For historical reports (e.g., 2-year range), rollups are pre-materialized on archived partitions per doc 12 §3; queries access them via partition-pruning. Drill down into raw historical Trip/HaulAssignment partitions (cold tier) only if user explicitly requests sub-daily granularity.

### Async generation (BullMQ + Redis)

- Large reports (1-year): ~10–30 sec generation; acceptable for async queue pattern.
- **Request flow:**
  1. UI submits `POST /api/v1/reports/*/generate` with filters (dateFrom, dateTo, format, etc.)
  2. API validates permissions, creates `ReportJob` (status=QUEUED), enqueues in BullMQ, returns `jobId`
  3. Background workers pull from queue, update job status to PROCESSING
  4. Worker queries rollup tables (+ archived partitions if needed), generates file, uploads to S3
  5. Updates job status to COMPLETED (or FAILED on error), stores `fileUrl` + `fileSize`
  6. UI polls `GET /api/v1/reports/jobs/:jobId` for status; when COMPLETED, fetches pre-signed URL
  7. `GET /api/v1/reports/download/:jobId` streams file from S3 (or CDN if cached)

### File storage (object storage)

Per doc 12 §6:
- Store in S3-compatible storage (MinIO self-hosted or managed S3/GCS); bucket `swat-reports`.
- **Caching key:** `(reportType, params, dataVersion)` — same params + same dataVersion return cached file.
- **Lifecycle:** files expire 7 days (TTL); auto-cleanup via object storage lifecycle rules.
- **Streaming:** download via pre-signed GET URLs or CDN; no in-memory buffering.
- **Compression:** Gzip before storage (~40% compression); decompress on client.

---

## Permissions

From [`06-auth-rbac.md`](../06-auth-rbac.md):

| Role | Permissions | Access |
|------|-----------|--------|
| Management (Kepala Dinas, Bidang) | `report:generate`, `report:download`, `levy:read` | View all reports, view levy transactions |
| Administrator | `report:generate`, `report:download`, `levy:create`, `levy:update`, `levy:delete`, `levy:read` | All reports, full levy CRUD, job deletion |
| Supervisor (Kepala Seksi) | `report:generate`, `report:download`, `levy:read` | View all reports, view levy transactions |
| Operator | None | No access to reports or levy |

**Permission definitions:**
- `report:generate` — submit report generation job.
- `report:download` — download completed report from object storage.
- `levy:read` — view levy entries.
- `levy:create`, `levy:update`, `levy:delete` — full levy management (admin only).

---

## Acceptance Criteria

- [x] Tonnage report (Excel) has 5 sheets: Summary, By Day, By Source, By TPS, Statistics
- [x] Fuel report (Excel) has Summary, By Vehicle, By Fuel Type (sheets), Variance Analysis
- [x] Route report sorted by frequency DESC; includes tonnage and time variance
- [x] Levy report shows monthly + YTD by category; branding header/footer
- [x] Report generation is async; endpoint returns jobId; polling available
- [x] Files expire after 7 days (auto-cleanup)
- [x] Excel formulas for totals/subtotals (not hardcoded values)
- [x] PDF export available for all report types
- [x] Levy CRUD endpoints functional
- [x] Large reports (1 year) complete within 30 seconds
- [x] All reports in Indonesian labels (headers, columns, category names)
- [x] Files gzipped in storage; streaming on download

---

## Test Cases

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T1 | Tonnage report generation | 100 DISPOSAL trips, 30 days | POST /reports/tonnage/generate?dateFrom=2026-05-01&dateTo=2026-05-30&format=xlsx | jobId returned; status=QUEUED |
| T2 | Async job completion | Job submitted | Poll GET /reports/jobs/<jobId> every 2 sec for 60 sec | status=COMPLETED; downloadUrl populated |
| T3 | Report download | Job completed, file on S3 | GET /reports/download/<jobId> | Binary file streamed; content-disposition=attachment |
| T4 | Levy create | POST /levies with date=2026-06-05, amount=1000000 | Check DB | Record created; createdAt/createdById set |
| T5 | Fuel report multi-sheet | 50 trips: 20× Premium, 30× Solar | POST /reports/fuel/generate; download .xlsx | 3 sheets: Summary, Premium (20 rows), Solar (30 rows) |
| T6 | Tonnage by source filter | 100 trips: 40× D, 60× R | POST /reports/tonnage/generate?wasteSourceId=<D> | Report shows D trips only; total matches |
| T7 | Report file expiry | Job completed 7 days ago | GET /reports/download/<jobId> | 404 Not Found |
| T8 | Levy monthly summary | 10 levy records (June), 3 categories, 500k/600k/700k | GET /levies?dateFrom=2026-06-01&dateTo=2026-06-30 | Total=1.8M IDR; grouped correctly |
| T9 | PDF export | Tonnage report format=pdf | POST /reports/tonnage/generate?format=pdf | Downloaded file is PDF; same data as Excel |
| T10 | Large report | 365 days, 10000+ trips | POST /reports/tonnage/generate?dateFrom=2025-01-01&dateTo=2026-01-01 | Completes within 45 sec without blocking |
| T11 | Levy update | Existing levy 1000000 | PATCH /levies/<id> with amount=1500000 | DB updated; GET confirms new amount |
| T12 | Route report sort | 5 routes with frequencies 100, 50, 75, 60, 40 | POST /reports/route/generate | Rows sorted DESC: 100, 75, 60, 50, 40 |
