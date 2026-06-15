# SWAT Phase 3 — Reporting & Exports: Verification & Gap Analysis

Status of the async report engine ([`phase-3.md`](./phase-3.md)). Epic **3.1 (Levy CRUD)**
shipped earlier (`src/modules/levy/`); this phase delivers Epics **3.2–3.6** — the Excel/PDF
report engine. Verified **2026-06-15** against the live Docker stack (Postgres / Redis / MinIO)
and the rich `seed:demo` dataset.

- **Admin login:** `admin` / `Password123!` · **API base:** `/api/v1` · **Web:** `/<locale>/reports`
- Generation requires `report:generate`; polling/download require `report:read`.

---

## 1. Task status (T-303 … T-316)

| Task | Item | Status | Where |
| --- | --- | --- | --- |
| T-303 | `ReportJob` model + BullMQ queue | ✅ | `prisma/schema.prisma`, migration `20260614000000_add_report_job`, `report-job.queue.ts` |
| T-304 | Report storage (MinIO, presigned URLs) | ✅ | `report-storage.service.ts` (+ `storage.service.ts` bucket param) |
| T-305 | Base Excel builder (DLH branding, SUM totals) | ✅ | `builders/base-report.builder.ts` |
| T-306 | Tonnage builder (5 sheets) | ✅ | `builders/tonnage-report.builder.ts` |
| T-307 | Fuel builder (4 sheets) | ✅ | `builders/fuel-report.builder.ts` |
| T-308 | Route (2 sheets) + Levy (**3 sheets**) | ✅ | `builders/{route,levy}-report.builder.ts` |
| T-309 | PDF generator (pdfmake) | ✅ | `builders/pdf-generator.service.ts` |
| T-310 | PDF variants (all 4 types) | ✅ | `builders/pdf-report.builder.ts` |
| T-311 | Async generate endpoints (202) | ✅ | `reports.controller.ts`, `reports.service.ts` |
| T-312 | Poll + download + delete | ✅ | `reports.controller.ts`, `reports.service.ts` |
| T-313 | Generation worker (BullMQ) | ✅ | `report-generation.worker.ts` |
| T-314 | Cleanup cron (7-day TTL) | ✅ | `report-cleanup.job.ts` |
| T-315 | Reports UI (form + polling + download) | ✅ | `apps/web/.../reports/page.tsx`, `components/reports/report-status-dialog.tsx`, `hooks/use-reports.ts`, `lib/reports-api.ts` |
| T-316 | Sample/preview page | ⏭️ Deferred | Optional stretch — not built (see §4) |

---

## 2. Automated verification (2026-06-15)

- **Backend:** `tsc` clean, `eslint` clean, **524 unit tests pass** (incl. report builders,
  PDF builders, `ReportsService` access-control/validation, monitoring). Coverage gate held.
- **Web:** `tsc` clean, `eslint` clean, **167 tests pass** (incl. `reports-api`).
- **App boot:** `AppModule` + `ReportsModule` (BullMQ worker + `@Cron` cleanup) initialize and
  resolve cleanly (`createApplicationContext`).
- **End-to-end against `seed:demo` + MinIO** (worker driven directly): all 4 report types in both
  **xlsx and pdf** generate → upload to `swat-reports` → presigned-download → open correctly.
  A 1-year tonnage xlsx (~23 KB, 5 sheets) renders in ~0.5 s; the levy xlsx pivot sheet
  ("Per Kategori (Bulanan)") shows all 24 monthly columns from the seeded data; PDFs carry the
  `%PDF-` header. Idempotency/expiry/ownership covered by unit tests.

## 3. Manual acceptance checklist

**Prereq [OPS]:** stack up, `prisma migrate deploy`, `pnpm db:seed:demo`, MinIO bucket
`swat-reports` exists. (`seed:demo` already populates the rollups the reports read.)

- [ ] **[WEB]** `/reports` shows 4 tabs (Tonase/BBM/Rute/Retribusi), date-range presets, xlsx/pdf
  radio; the **Generate** button only appears with `report:generate`.
- [ ] **[WEB]** Submit → status dialog polls (~2 s) QUEUED→PROCESSING→COMPLETED → **Download**
  downloads the file (attachment); a bad/empty range surfaces a toast, FAILED shows the error.
- [ ] **[API]** `POST /api/v1/reports/tonnage/generate` → **202** `{jobId,status,estimatedCompletionAt}`;
  inverted `dateFrom>dateTo` → **400**; missing `report:generate` → **403**.
- [ ] **[API]** `GET /reports/jobs/:id` returns status; another user's job → **403**; missing → **404**.
- [ ] **[API]** `GET /reports/download/:id` → `{url}` only when COMPLETED (else **409**); expired → **404**.
- [ ] **[OPS]** Excel files are DLH-branded with SUM-formula totals; PDFs are single-page summaries.

---

## 4. Gap analysis — deviations & deferrals

**Accepted deviations from the spec (reasonable):**
- **`objectKey` stored, not `fileUrl`.** Presigned URLs expire, so storing one is stale-prone; the
  download endpoint signs a fresh URL on demand (`reports.service.getDownloadUrl`).
- **Download returns `{url}` JSON** (the SPA navigates with a forced `Content-Disposition:
  attachment`) rather than a server redirect/stream — simpler with the API envelope, avoids the
  async popup-blocker, and gives a friendly filename.
- **`report:read` gates poll + download** (no separate `report:download` key). Both are read
  operations and ownership is enforced per-row; a distinct key added friction without security gain.
- **Excel exports are tabular, not charted.** ExcelJS cannot *author* native charts; builders emit
  chart-ready data instead (e.g. tonnage "% of total" per source). Interactive charts already live
  on the Phase-2 web dashboards.

**Deferred (optional stretch, not blocking):**
- **T-316 sample/preview page** — pre-generated sample downloads. Skipped; the live generator with
  `seed:demo` data serves the same "see the format" need.
- **Report history table** (last-N jobs per user) — backend supports it (jobs are queryable), UI not
  built; the status dialog covers the single-job flow.

## 5. Review fixes folded in (2026-06-15)

From a multi-agent review + gap analysis of this phase:
- **Closed the one real spec gap:** added the Levy report's 3rd sheet — a **category × month pivot**
  with a YTD column (`levy-report.builder.ts` + new `MonitoringService.levyByCategoryMonth`).
- **Worker hardening:** a job cancelled (row deleted) mid-render is treated as a clean cancel
  (Prisma `P2025`) — no spurious retries or unhandled errors (`report-generation.worker.ts`).
- **Validation:** `generate` rejects an inverted date window with **400** before enqueueing.
- **Download UX:** forced attachment disposition + `window.location.assign` (no popup blocker);
  `formatBytes` distinguishes a 0-byte file from unknown size.
- **Redis:** `rediss://` (TLS) + username/encoded-password supported in the BullMQ connection parser.
