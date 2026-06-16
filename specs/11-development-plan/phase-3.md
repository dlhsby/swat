# Phase 3 — Reporting & Exports

> **Design ready.** The **Laporan** screen is designed (hi-fi) — report-type card grid + generate
> dialog (date range + format radio + async note) + history table (download / "Diproses" spinner). See
> [`13-design/03-hifi-spec.md`](../13-design/03-hifi-spec.md) screen "Laporan" and
> [`09-modules/reports.md`](../09-modules/reports.md). Keep **Levy/Retribusi CRUD** here (parity G12);
> rekapitulasi/monthly summaries map to the report exports (parity G11). Reuse the Phase-1 component
> library.

## Goal
Provide exportable, offline-ready reports in Excel and PDF formats for management review, auditing, and compliance. Reports include tonnage trends, fuel consumption analysis, route summaries, and levy/retribusi transactions—all with Indonesian labels, DLH branding, and async job handling for large datasets.

## Scope
- **Excel export engine:** ExcelJS library; multi-sheet workbooks (summary + detail); styled headers; formulas for totals; embedded charts.
- **PDF export engine:** pdfmake or Puppeteer; HTML-to-PDF for rich layouts; supported for all report types.
- **Report types:** Tonnage (daily/monthly summary by route/waste source), Fuel (daily per vehicle, per fuel type, variance analysis), Route (frequency, tonnage, time variance), Levy (monthly + YTD by category).
- **Async report generation:** BullMQ + Redis job queue; POST returns jobId; poll for completion; download when ready; 7-day artifact expiry.
- **Levy management CRUD:** Create, read, update, delete levy entries; permissions gated (`levy:*`).
- **Performance:** Read all years (including archived) via rollup tables; generate 1-year reports within 30 seconds; cache generated artifacts in object storage.

## Dependencies
Phase 1 complete (Trip, Haul, HaulAssignment, Levy entities); Phase 2 complete (rollup tables + aggregate caching). Rollup tables readable across all years.

## Tasks

## Epic 3.1 — Levy management CRUD (Size: M) [parallel-group: A]

#### T-301. Levy endpoints: read + filter + pagination (Size: M · Coverage: ≥85%)
  - Depends on: Phase 1 (Levy model, schema in place)
  - Files:
    - `apps/backend/src/modules/levy/levy.controller.ts` (create)
    - `apps/backend/src/modules/levy/levy.service.ts` (create)
    - `apps/backend/src/modules/levy/levy.repository.ts` (create)
    - `apps/backend/src/modules/levy/levy.module.ts` (create)
    - `apps/backend/src/modules/levy/dto/levy-query.dto.ts` (create) — query validation
    - `apps/backend/test/levy.e2e-spec.ts` (create)
  - Steps:
    1. **Implement 2 read endpoints:**
       - `GET /api/v1/levies` (list) — paginated, filterable
         - Query params: `dateFrom`, `dateTo`, `categoryId`, `page`, `limit`
         - Response: `ApiResponse<Levy[]>` with `meta: { total, page, limit }`
       - `GET /api/v1/levies/:id` (get one) — full levy detail
    2. **Filter logic:**
       - By date range: `WHERE date BETWEEN dateFrom AND dateTo`
       - By category: `WHERE categoryId = ?`
       - Defaults: all categories, last 30 days if no date range specified
    3. **Pagination:**
       - Default limit: 20, max 100
       - Compute total count; return in `meta`
    4. **Permission:** `levy:read` required
    5. **Tests (TDD):**
       - Create 50 levy records (multiple categories, date ranges)
       - Test list endpoint: returns paginated results; total count correct
       - Test filtering by date/category: subset returned correctly
       - Test pagination: limit 10 → 5 pages, last page has 0 items if total not divisible by 10
  - Acceptance criteria:
    - [ ] List endpoint returns paginated levies with filters
    - [ ] Date-range filtering works
    - [ ] Meta.total, page, limit correct
    - [ ] Get-by-id endpoint returns single levy
    - [ ] Coverage ≥85%; lint+typecheck clean

---

#### T-302. Levy create + update + delete (Size: M · Coverage: ≥85%)
  - Depends on: T-301
  - Files:
    - `apps/backend/src/modules/levy/levy.service.ts` (modify)
    - `apps/backend/src/modules/levy/dto/levy-create.dto.ts`, `levy-update.dto.ts` (create)
    - `apps/backend/test/levy.e2e-spec.ts` (modify)
  - Steps:
    1. **Create endpoint:**
       - `POST /api/v1/levies` with body: `{ categoryId, categoryName, date, amount }`
       - Validators:
         - `categoryId` integer, > 0
         - `categoryName` non-empty string (or derive from categoryId if enum)
         - `date` in YYYY-MM-DD format
         - `amount` positive integer (IDR)
       - Set `createdById: currentUser.id`, `createdAt: now()`
       - Return created levy with generated `id`
    2. **Update endpoint:**
       - `PATCH /api/v1/levies/:id` with body: `{ categoryId?, categoryName?, date?, amount? }`
       - Validate same as create (optional fields)
       - Set `updatedById: currentUser.id`, `updatedAt: now()`
       - Return updated levy
    3. **Delete endpoint:**
       - `DELETE /api/v1/levies/:id` → soft delete (set `deletedAt: now()`) or hard delete (per spec — assume soft delete to preserve audit trail)
       - Return 204 No Content or `{ success: true }`
    4. **Permissions:**
       - Create: `levy:create`
       - Update: `levy:update`
       - Delete: `levy:delete`
    5. **Tests:**
       - Create levy: verify ID generated, timestamps set, audit user captured
       - Update levy: amount changes, updatedAt updates, audit user changes
       - Delete levy: soft-deleted, not returned in list (unless specifically queried)
       - Permission tests: missing permission → 403 Forbidden
  - Acceptance criteria:
    - [ ] Create endpoint returns 201 with created levy
    - [ ] Update endpoint modifies fields, audit trail updated
    - [ ] Delete endpoint soft-deletes levy (not returned in normal list)
    - [ ] Permissions enforced
    - [ ] Coverage ≥85%

---

## Epic 3.2 — Report job infrastructure (Size: M) [parallel-group: A]

#### T-303. ReportJob table + BullMQ queue setup (Size: M)
  - Depends on: Phase 0 (Redis available)
  - Files:
    - `apps/backend/prisma/schema.prisma` (modify) — add `ReportJob` model
    - `apps/backend/prisma/migrations/<timestamp>_add_report_job_table.sql` (create)
    - `apps/backend/src/modules/reports/report-job.queue.ts` (create) — BullMQ producer
    - `apps/backend/src/modules/reports/report-job.worker.ts` (create) — BullMQ worker
  - Steps:
    1. **ReportJob model:**
       ```prisma
       model ReportJob {
         id            String          @id @default(uuid(7))  // UUID v7
         userId        String
         user          User            @relation(fields: [userId], references: [id])
         reportType    String          // 'tonnage' | 'fuel' | 'route' | 'levy'
         format        String          // 'xlsx' | 'pdf'
         status        String          // 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
         filters       Json            // { dateFrom, dateTo, wasteSourceId?, siteId?, ... }
         fileUrl       String?         // S3 URL after completion
         fileSize      BigInt?
         errorMessage  String?
         createdAt     DateTime        @default(now()) @db.Timestamptz(6)
         completedAt   DateTime?       @db.Timestamptz(6)
         expiresAt     DateTime?       @db.Timestamptz(6)  // auto-delete after 7 days
         @@index([userId])
         @@index([status])
         @@index([createdAt])
       }
       ```
    2. **BullMQ producer setup:**
       - `ReportJobQueue` service: `createJob(reportType, format, filters, userId)` → enqueue to Redis
       - Options: `removeOnComplete: true` (after expiry window), retries: 3
    3. **BullMQ worker setup:**
       - `ReportJobWorker` listening on queue
       - On job start: update `status = PROCESSING`, set `updatedAt`
       - On job complete: update `status = COMPLETED`, `fileUrl`, `fileSize`, `completedAt`, `expiresAt = now() + 7 days`
       - On job fail: update `status = FAILED`, `errorMessage = e.message`
       - Pool size: 2–3 workers (CPU-bound report generation)
    4. **Cleanup:**
       - Cron job (`@Cron('0 3 * * *')` daily at 3 AM): delete from `ReportJob` where `expiresAt < now()` and delete corresponding files from S3
  - Acceptance criteria:
    - [ ] ReportJob table created with indexes
    - [ ] BullMQ queue configured and tested (dummy job)
    - [ ] Worker processes jobs; updates status correctly
    - [ ] Cleanup job deletes expired artifacts

---

#### T-304. Report storage: object storage + signed URLs (Size: M)
  - Depends on: Phase 0 (MinIO / S3 configured)
  - Files:
    - `apps/backend/src/modules/reports/report-storage.service.ts` (create)
    - `apps/backend/test/report-storage.service.spec.ts` (create)
  - Steps:
    1. **Report storage service:**
       - `uploadReport(reportJobId, fileBuffer, contentType)`: upload to S3 bucket `swat-reports`
         - Key: `reports/${reportJobId}/${reportType}_${dateTime}.${ext}`
         - Set content-type, server-side encryption
         - Return object key + size
       - `getDownloadUrl(reportJobId, expirySeconds = 3600)`: generate pre-signed GET URL (1 hour expiry)
       - `deleteReport(reportJobId)`: delete from S3 and DB
    2. **Stream upload (large files):**
       - Support streaming from report generator → S3 without buffering in memory
       - Use `aws-sdk` / `minio` client with multipart upload
    3. **Error handling:**
       - S3 unavailable → retry with backoff
       - Update ReportJob.errorMessage if upload fails
    4. **Test:**
       - Mock S3 client; test upload/download/delete flows
       - Test signed URL generation (verify expiry)
  - Acceptance criteria:
    - [ ] Report files uploaded to S3 with correct keys
    - [ ] Download URLs signed and expiring correctly
    - [ ] Cleanup deletes files from S3 and DB

---

## Epic 3.3 — Excel report builders (Size: L) [parallel-group: B]

#### T-305. ExcelJS setup + base builder class (Size: M)
  - Depends on: T-303
  - Files:
    - `apps/backend/src/modules/reports/builders/base-report.builder.ts` (create)
    - `apps/backend/src/modules/reports/builders/report-builder.interface.ts` (create)
  - Steps:
    1. **Base report builder:**
       - Abstract class with common methods:
         - `addHeader(workbook, title, period, logo?)`: styled header row with DLH branding
         - `addFooter(worksheet)`: page number, generated timestamp
         - `styleHeaderRow(worksheet, row)`: bold, DLH green background (RGB 0, 102, 51)
         - `addTotalsRow(worksheet, column, formula)`: SUM formula for column
         - `formatCurrency(value)`: format IDR with K/M/B suffixes
         - `formatDate(date)`: format as DD/MM/YYYY
         - `getWorkbook()`: ExcelJS workbook instance
    2. **DLH branding:**
       - Logo: fetch from S3 or embed base64 (small PNG)
       - Title: "Dinas Lingkungan Hidup Kota Surabaya"
       - Subtitle: report type (e.g., "Laporan Tonase Pengangkutan Sampah")
       - Footer: "Generated: <timestamp> | Page <n>"
    3. **Test:**
       - Create dummy workbook; verify header/footer structure
       - Test currency formatting (1000000 → "1M", 500000 → "500K")
  - Acceptance criteria:
    - [ ] Base builder provides reusable styling + formatting methods
    - [ ] DLH branding applied to all reports (header, colors, logo)
    - [ ] Test workbook renders correctly

---

#### T-306. Tonnage report builder (Size: L · Coverage: ≥75%)
  - Depends on: T-305, Phase 2 (rollup tables + monitoring API)
  - Files:
    - `apps/backend/src/modules/reports/builders/tonnage-report.builder.ts` (create)
    - `apps/backend/test/tonnage-report.builder.spec.ts` (create)
  - Steps:
    1. **Report structure (5 sheets per [`09-modules/reports.md`](../09-modules/reports.md) Report 1):**
       - **Sheet 1: Summary** — Title "Laporan Tonase Pengangkutan Sampah", period. Table: Month | Total (kg) | Haul count | Avg/haul | Trend (%). Grand total row at bottom.
       - **Sheet 2: By Day (detailed)** — Date | Tonnage | Haul count | TPS count | Reconciliation status. Conditional red if TPA mismatch.
       - **Sheet 3: By Waste Source** — Source | Tonnage | % of total | Haul count | Avg/haul. Embedded pie chart.
       - **Sheet 4: By TPS (top 20)** — Rank | TPS name | Tonnage | Haul count | Avg weight | Last haul date.
       - **Sheet 5: Statistics** — Min/max/avg tonnage per day, busiest/slowest day, most-served TPS.
    2. **Data fetching:**
       - Call monitoring API endpoints (T-204, T-205) or query rollup tables directly
       - `DailyTonnage` for sheet 2 data
       - `MonthlyTonnageBySource` for sheet 3
       - `MonthlyTonnageBySite` for sheet 4
       - Compute statistics from query results
    3. **Styling:**
       - Headers: DLH green, bold, white text
       - Alternating row colors: light gray every other row
       - Number formatting: kg with thousands separator
       - Percentages: 1 decimal place
    4. **Formulas:**
       - Grand total row: `SUM(column)` formula (not hardcoded)
       - Subtotals per section: same approach
    5. **Charts:**
       - Sheet 3: pie chart of tonnage by source (auto-sized)
       - Sheet 2: optional line chart of tonnage trend (stretch)
    6. **Test:**
       - Create dummy rollup data (10 days, 3 sources, 5 TPS)
       - Generate Excel; verify all 5 sheets present
       - Check formulas in totals rows (not hardcoded values)
       - Spot-check values (calculated, not fabricated)
  - Acceptance criteria:
    - [ ] Tonnage Excel report: 5 sheets with correct structure
    - [ ] Data aggregated correctly (DailyTonnage + monthly summaries)
    - [ ] Formulas used for totals (not hardcoded)
    - [ ] DLH branding applied
    - [ ] Charts embedded (at least pie chart on source sheet)
    - [ ] Coverage ≥75% (builder is data-heavy; 100% overkill)

---

#### T-307. Fuel report builder (Size: M · Coverage: ≥75%)
  - Depends on: T-305, Phase 2 (DailyFuelByVehicle rollup)
  - Files:
    - `apps/backend/src/modules/reports/builders/fuel-report.builder.ts` (create)
    - `apps/backend/test/fuel-report.builder.spec.ts` (create)
  - Steps:
    1. **Report structure (4 sheets per spec Report 2):**
       - **Sheet 1: Summary** — "Laporan Konsumsi Bahan Bakar", period. KPIs: Total approved (L), requested (L), variance (%), total cost (IDR).
       - **Sheet 2: By Vehicle (daily pivot)** — Date | Vehicle (plate) | Model | Fuel type | Approved (L) | Requested (L) | Variance (%) | Cost (IDR). Subtotals per vehicle.
       - **Sheet 3+: By Fuel Type** — One sheet per fuel type. Date | Vehicle | Approved (L) | Cost (IDR). Subtotal per date.
       - **Sheet final: Variance Analysis** — Flags entries where approved < requested by >5%. Date | Vehicle | Fuel | Requested | Approved | Variance (%) | Flag.
    2. **Data fetching:**
       - `DailyFuelByVehicle` rollup for fuel sums
       - Join with `Vehicle`, `Fuel` for details
       - Compute cost: `fuelApprovedLiters * Fuel.pricePerLiter`
       - Compute variance %: `(approved / requested - 1) * 100`
    3. **Styling:**
       - Same DLH branding as tonnage
       - Variance Analysis: RED background for rows where approved < requested by >5%
       - Cost column: formatted as currency (IDR)
    4. **Formulas:**
       - Subtotals per vehicle + fuel type: `SUM` formulas
       - Cost column: `Approved_L * Price_per_L` formula
    5. **Test:**
       - Create fuel data: multiple vehicles, fuel types, approved vs requested variance
       - Generate Excel; verify sheets + data accuracy
  - Acceptance criteria:
    - [ ] Fuel Excel report: 4+ sheets with correct structure
    - [ ] Cost calculated correctly (liters × price)
    - [ ] Variance flagged RED where applicable
    - [ ] Subtotals via formulas
    - [ ] Coverage ≥75%

---

#### T-308. Route + Levy report builders (Size: M · Coverage: ≥70%)
  - Depends on: T-305, Phase 2 (MonthlyRouteActivity rollup), T-301 (Levy CRUD)
  - Files:
    - `apps/backend/src/modules/reports/builders/route-report.builder.ts` (create)
    - `apps/backend/src/modules/reports/builders/levy-report.builder.ts` (create)
    - `apps/backend/test/route-report.builder.spec.ts`, `levy-report.builder.spec.ts` (create)
  - Steps:
    1. **Route report (per spec Report 3):**
       - **Sheet 1: Frequency** — Rank | Route (origin → dest) | Category | Distance (km) | Frequency | Total tonnage | Avg/trip. Sorted by frequency DESC.
       - **Sheet 2: Performance** — Route | Planned time (target) | Actual avg time | Variance (%) | Vehicles used | Drivers used.
       - Data from `MonthlyRouteActivity` + Trip aggregations
       - Test with 10 routes, verify sort + aggregations
    2. **Levy report (per spec Report 4):**
       - **Sheet 1: Monthly Summary** — "Laporan Retribusi", period. Table: Month | Category | Amount (IDR) | Count | Avg/transaction. Grand total IDR.
       - **Sheet 2: Daily Detail** — Date | Category | Amount | Count. Subtotal per day.
       - **Sheet 3: By Category (pivot)** — Category | YTD total | Jan | Feb | … | Dec (monthly columns).
       - Data from `Levy` table; group by month × category
       - Test with levy data across 3+ months + 3+ categories
  - Acceptance criteria:
    - [ ] Route Excel report: 2 sheets, sorted by frequency DESC
    - [ ] Levy Excel report: 3 sheets, monthly + YTD aggregations
    - [ ] Both reports DLH-branded
    - [ ] Coverage ≥70%

---

## Epic 3.4 — PDF report builders (Size: M) [parallel-group: B]

#### T-309. PDF report generator (pdfmake) setup (Size: M)
  - Depends on: T-303
  - Files:
    - `apps/backend/src/modules/reports/builders/pdf-generator.service.ts` (create)
    - `apps/backend/test/pdf-generator.service.spec.ts` (create)
  - Steps:
    1. **pdfmake setup:**
       - Install `pdfmake` (lightweight, no Chromium/Puppeteer overhead)
       - Define layout helpers for DLH reports:
         - `createHeader()`: DLH logo, title, period
         - `createTable(data, columns)`: styled table with alternating rows
         - `createChart()`: pdfmake table-based "chart" (ASCII-style pie/bar — pdfmake limitation)
         - `createFooter()`: page number, timestamp
    2. **Styling:**
       - DLH green headings (RGB 0, 102, 51)
       - Alternating row fills (light gray / white)
       - Font: Roboto or Helvetica (pdfmake defaults)
    3. **Page breaks:**
       - Auto-page-break for long tables (pdfmake handles)
       - Keep headers/footers on each page
    4. **Test:**
       - Generate sample PDF; verify structure + styling via PDF parsing library (e.g., `pdf-parse`)
  - Acceptance criteria:
    - [ ] pdfmake generates PDF with correct header/footer
    - [ ] Tables render with styling
    - [ ] Page breaks handled automatically
    - [ ] File output is valid PDF

---

#### T-310. PDF variants for all reports (Size: M · Coverage: ≥70%)
  - Depends on: T-309, T-306, T-307, T-308
  - Files:
    - `apps/backend/src/modules/reports/builders/pdf-report.builder.ts` (create) — base class
    - Extend for each report type (or use single builder with switches)
    - `apps/backend/test/pdf-report.builder.spec.ts` (create)
  - Steps:
    1. **PDF variants:**
       - **Tonnage PDF:** Summary sheet (title, 4 KPI cards, monthly table, pie chart). Single page or 2 pages (summary + detailed breakdown).
       - **Fuel PDF:** Summary sheet (title, KPI cards, vehicle table). Single page.
       - **Route PDF:** Route frequency table. Single page.
       - **Levy PDF:** Monthly summary table + signature block for approval. Single page.
    2. **Simpler than Excel:** PDFs are single-page summaries (not multi-sheet); good for email/printing.
    3. **Test:**
       - Generate PDF for each report type; verify content + formatting
  - Acceptance criteria:
    - [ ] PDF generated for all 4 report types
    - [ ] Content matches Excel (summary data only, simplified layout)
    - [ ] Single page or auto-break appropriately
    - [ ] Coverage ≥70%

---

## Epic 3.5 — Report generation API & async job handling (Size: L) [parallel-group: B]

#### T-311. Report generation endpoints (async POST) (Size: M · Coverage: ≥85%)
  - Depends on: T-303, T-306–T-310 (all builders ready)
  - Files:
    - `apps/backend/src/modules/reports/reports.controller.ts` (create)
    - `apps/backend/src/modules/reports/reports.service.ts` (create)
    - `apps/backend/src/modules/reports/reports.module.ts` (create)
    - `apps/backend/src/modules/reports/dto/report-request.dto.ts` (create) — request body validation
    - `apps/backend/test/reports.e2e-spec.ts` (create)
  - Steps:
    1. **Implement 4 async report endpoints:**
       - `POST /api/v1/reports/tonnage/generate` — request: `{ dateFrom, dateTo, format, wasteSourceId?, siteId? }`
       - `POST /api/v1/reports/fuel/generate` — request: `{ dateFrom, dateTo, format, vehicleId?, fuelTypeId? }`
       - `POST /api/v1/reports/route/generate` — request: `{ dateFrom, dateTo, format }`
       - `POST /api/v1/reports/levy/generate` — request: `{ dateFrom, dateTo, format, categoryId? }`
       - All return `202 Accepted` with `{ jobId, status, estimatedCompletionAt }`
    2. **Logic:**
       - Validate request body (Zod schema)
       - Create `ReportJob` record with status `QUEUED`
       - Enqueue to BullMQ
       - Return immediately with jobId + estimates (e.g., 1-month tonnage ~5 sec, 1-year ~30 sec)
    3. **Permissions:**
       - All require `report:generate` permission
    4. **Error handling:**
       - Invalid date range → 400 Bad Request
       - Missing permission → 403 Forbidden
    5. **Tests (TDD):**
       - POST report request → 202 returned with jobId
       - jobId matches created ReportJob record
       - Verify filters stored in ReportJob.filters JSON
  - Acceptance criteria:
    - [ ] 4 report generation endpoints return 202 with jobId
    - [ ] ReportJob created in DB with QUEUED status
    - [ ] Job enqueued to BullMQ
    - [ ] Filters validated (400 on bad input)
    - [ ] Coverage ≥85%

---

#### T-312. Job polling + download endpoints (Size: M · Coverage: ≥85%)
  - Depends on: T-311
  - Files:
    - `apps/backend/src/modules/reports/reports.service.ts` (modify)
    - `apps/backend/test/reports.e2e-spec.ts` (modify)
  - Steps:
    1. **Polling endpoint:**
       - `GET /api/v1/reports/jobs/:jobId` — return job detail
       - Response: `{ jobId, reportType, status, createdAt, completedAt, fileUrl?, estimatedCompletionAt? }`
       - Status codes:
         - If job missing: 404 Not Found
         - If permission denied (different user): 403 Forbidden
    2. **Download endpoint:**
       - `GET /api/v1/reports/download/:jobId` — stream file if COMPLETED
       - Response: redirect to pre-signed S3 URL (30-min expiry) or stream from S3
       - Status codes:
         - If job not found or not COMPLETED: 404 or 202 "not ready yet"
         - If file expired (> 7 days): 404
         - If permission denied: 403
       - Headers: `Content-Disposition: attachment; filename="report_<jobId>.<ext>"`
    3. **Delete endpoint:**
       - `DELETE /api/v1/reports/jobs/:jobId` — cancel queued job or delete file if completed
       - Removes ReportJob record and deletes file from S3
       - Returns 204 No Content
    4. **Tests:**
       - Create job → poll → job PROCESSING → poll → job COMPLETED → download → file received
       - Test expiry: wait >7 days → download → 404
       - Test permission: create job as user A → user B tries to poll/download → 403
       - Test cancel: cancel queued job → removed from queue + DB
  - Acceptance criteria:
    - [ ] Polling endpoint returns job status correctly
    - [ ] Download returns pre-signed URL or file stream when COMPLETED
    - [ ] File expiry (7 days) enforced
    - [ ] Permission checks: only job creator can poll/download
    - [ ] Delete endpoint cancels/removes jobs
    - [ ] Coverage ≥85%

---

#### T-313. Report generation worker (BullMQ) (Size: L · Coverage: ≥80%)
  - Depends on: T-311, T-306–T-310 (builders), T-303 (storage)
  - Files:
    - `apps/backend/src/modules/reports/report-generation.worker.ts` (create)
    - `apps/backend/test/report-generation.worker.spec.ts` (create) — integration test
  - Steps:
    1. **Worker process method:**
       ```typescript
       async processReportJob(job) {
         const reportJob = await db.reportJob.findUnique({ where: { id: job.data.jobId } })
         
         // Update status to PROCESSING
         await db.reportJob.update({ data: { status: 'PROCESSING' } })
         
         // Fetch data (rollups + detail, as needed)
         const data = await this.fetchReportData(
           reportJob.reportType,
           reportJob.filters
         )
         
         // Generate file (Excel or PDF)
         let buffer
         if (reportJob.format === 'xlsx') {
           const builder = this.getBuilder(reportJob.reportType)
           buffer = await builder.build(data)
         } else if (reportJob.format === 'pdf') {
           buffer = await this.pdfGenerator.generate(reportJob.reportType, data)
         }
         
         // Upload to S3
         const { objectKey, sizeBytes } = await this.storage.uploadReport(
           reportJob.id,
           buffer,
           `application/${reportJob.format}`
         )
         
         // Generate signed download URL
         const downloadUrl = await this.storage.getDownloadUrl(reportJob.id)
         
         // Update ReportJob with completion
         await db.reportJob.update({
           where: { id: reportJob.id },
           data: {
             status: 'COMPLETED',
             fileUrl: downloadUrl,
             fileSize: sizeBytes,
             completedAt: new Date(),
             expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
           }
         })
       }
       ```
    2. **Error handling:**
       - Catch exceptions; set `status = FAILED`, `errorMessage`
       - Retry up to 3 times (BullMQ config)
       - Log full stack trace (no PII)
    3. **Data fetching:**
       - For each report type, fetch from appropriate rollup tables / API
       - Cache intermediate results if large (avoid re-querying)
    4. **Performance targets:**
       - 1-month tonnage: ~5 sec
       - 1-month fuel: ~5 sec
       - 1-year tonnage: ~30 sec
       - Test with real-sized rollup data (seeded)
    5. **Tests:**
       - Create a report job; manually trigger worker
       - Verify file uploaded to S3
       - Verify ReportJob.status = COMPLETED, fileUrl populated
       - Verify downloaded file matches expected content (spot-check Excel cell values)
  - Acceptance criteria:
    - [ ] Worker processes jobs; generates Excel/PDF correctly
    - [ ] Status updated: QUEUED → PROCESSING → COMPLETED (or FAILED)
    - [ ] File uploaded to S3; signed URL generated
    - [ ] Large reports (1-year, 30+ sec) handled asynchronously (don't block)
    - [ ] Error handling: job fails gracefully; logged; can retry
    - [ ] Coverage ≥80% (worker has complex data handling)

---

#### T-314. Report cleanup job (TTL 7 days) (Size: S · Coverage: ≥80%)
  - Depends on: T-312, T-313
  - Files:
    - `apps/backend/src/jobs/report-cleanup.job.ts` (create)
    - `apps/backend/test/report-cleanup.job.spec.ts` (create)
  - Steps:
    1. **Daily cleanup cron (`@Cron('0 3 * * *')` at 3 AM):**
       - Query `ReportJob` where `expiresAt < now()` and status = COMPLETED
       - For each job:
         - Delete file from S3 (via `ReportStorageService.deleteReport()`)
         - Delete DB record
       - Log counts deleted + total storage freed
    2. **Error handling:**
       - If S3 delete fails: log error, continue to next (don't halt)
       - If DB delete fails: alert (probably a bug)
    3. **Test:**
       - Create job with `expiresAt = now() - 1 day`
       - Run cleanup job
       - Verify file gone from S3, record deleted from DB
  - Acceptance criteria:
    - [ ] Cleanup job runs daily; deletes expired artifacts
    - [ ] S3 and DB deletions synchronized
    - [ ] Log output shows counts
    - [ ] Coverage ≥80%

---

## Epic 3.6 — Reports UI (Next.js) (Size: M) [parallel-group: C]

#### T-315. Report generation form + status polling UI (Size: M · Coverage: ≥70%)
  - Depends on: T-311, T-312
  - Files:
    - `apps/web/app/(admin)/laporan/page.tsx` (create) — report entry page
    - `apps/web/src/components/reports/report-form.tsx` (create) — form component
    - `apps/web/src/components/reports/job-status-poller.tsx` (create) — status modal
    - `apps/web/src/hooks/use-report-generation.ts` (create) — TanStack Query hooks
    - `apps/web/src/hooks/use-job-polling.ts` (create) — polling hook
  - Steps:
    1. **Report form:**
       - Tabs: Tonnage | Fuel | Route | Levy
       - Each tab has:
         - Date range picker (from/to, presets: last 7 days, this month, YTD)
         - Format selector (radio: Excel / PDF)
         - Optional filters (waste source, site, vehicle, etc.)
         - Submit button
       - On submit: POST to `/api/v1/reports/*/generate` → get jobId → open status modal
    2. **Status modal:**
       - Display: "Report generating... <estimated time>"
       - Progress bar (if ETA available, show %)
       - Poll `GET /api/v1/reports/jobs/:jobId` every 2 sec
       - On COMPLETED: show "Download" button + file size
       - On FAILED: show error message
       - Button: Download (link to download endpoint) or Close
    3. **Report history (stretch):**
       - Optional: table of past jobs (last 10, per user)
       - Columns: date created, report type, file size, download button, delete button
    4. **Tests:**
       - Mock report endpoints
       - Test form submission → jobId returned
       - Test polling: status changes QUEUED → PROCESSING → COMPLETED
       - Test download button navigates to download endpoint
  - Acceptance criteria:
    - [ ] Report form renders; all fields accessible
    - [ ] Submit triggers POST; jobId returned
    - [ ] Status modal polls every 2 sec
    - [ ] Download button visible when COMPLETED
    - [ ] Error message displayed on FAILED
    - [ ] Coverage ≥70%

---

#### T-316. Report preview / sample output (optional stretch) (Size: S)
  - Depends on: T-313
  - Files:
    - `apps/web/app/(admin)/laporan/samples/page.tsx` (create) — sample page
  - Steps:
    1. **Static samples:**
       - Pre-generate sample reports (1 month of synthetic data)
       - Host as static downloads (no job queue needed)
       - Link from `/laporan` page: "Download sample tonnage report (Excel)", etc.
    2. **Purpose:** Help users understand report format before generating real one
  - Acceptance criteria:
    - [ ] Sample reports available for download
    - [ ] Helps users understand report structure

---

## Exit Criteria (Phase 3)

- [ ] Levy CRUD endpoints: list, create, update, delete all working (≥85% coverage)
- [ ] Report job infrastructure: ReportJob table, BullMQ queue, 2–3 workers processing jobs
- [ ] 4 report builders (Tonnage, Fuel, Route, Levy) generating valid Excel files with DLH branding, formulas, charts
- [ ] PDF export available for all 4 report types (via pdfmake)
- [ ] 4 report generation endpoints: `POST /reports/*/generate` async, returns jobId (202 Accepted)
- [ ] Job polling endpoint: `GET /reports/jobs/:jobId` returns status + ETA
- [ ] Download endpoint: `GET /reports/download/:jobId` streams file or redirects to S3 URL (with expiry)
- [ ] Report generation worker: processes jobs, generates file, uploads to S3, updates ReportJob status
- [ ] Cleanup job: runs nightly, deletes expired artifacts (>7 days) from S3 and DB
- [ ] Reports UI: form to submit reports, polling modal for status, download button when ready
- [ ] Large reports (1-year spans, 10k+ rows): complete within 45 seconds without blocking UI
- [ ] All generated Excel files have: DLH header/footer, styled columns, formulas (not hardcoded totals), embedded charts where applicable
- [ ] All generated PDFs have: DLH branding, correct summary data, ready for email/printing
- [ ] Integration tests: create report → poll → complete → download → verify content all pass
- [ ] Unit tests: ≥80% coverage (builders, services); lint + typecheck clean
- [ ] Permissions enforced: `report:generate`, `report:download`, `levy:*` checked on all endpoints
- [ ] Error handling: invalid filters → 400, missing permission → 403, expired files → 404, S3 unavailable → logged + retried

## Task Summary (T-301 … T-316)

| Task ID | Epic | Title | Size |
|---------|------|-------|------|
| T-301 | 3.1 | Levy endpoints: read + filter + pagination | M |
| T-302 | 3.1 | Levy create + update + delete | M |
| T-303 | 3.2 | ReportJob table + BullMQ queue setup | M |
| T-304 | 3.2 | Report storage: object storage + signed URLs | M |
| T-305 | 3.3 | ExcelJS setup + base builder class | M |
| T-306 | 3.3 | Tonnage report builder | L |
| T-307 | 3.3 | Fuel report builder | M |
| T-308 | 3.3 | Route + Levy report builders | M |
| T-309 | 3.4 | PDF report generator (pdfmake) setup | M |
| T-310 | 3.4 | PDF variants for all reports | M |
| T-311 | 3.5 | Report generation endpoints (async POST) | M |
| T-312 | 3.5 | Job polling + download endpoints | M |
| T-313 | 3.5 | Report generation worker (BullMQ) | L |
| T-314 | 3.5 | Report cleanup job (TTL 7 days) | S |
| T-315 | 3.6 | Report generation form + status polling UI | M |
| T-316 | 3.6 | Report preview / sample output (optional stretch) | S |

**Total tasks:** 16 | **Est. effort:** 2–3 weeks

---

## Milestone
**End of Phase 3 — Reporting & Exports operational.** Management can export tonnage, fuel, route, and levy reports in Excel and PDF formats. Async job handling prevents UI blocking on large datasets. Reports read all years (including archived) via rollups. Artifacts cached 7 days with auto-cleanup. System ready for Phase 4 (Weighbridge integration) or Phase 8 (Field/Mobile).
