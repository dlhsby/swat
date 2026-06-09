# SWAT Phase 2 — Manual Verification Checklist

Step-by-step acceptance pass for Phase 2 (Monitoring & Analytics). Work top-to-bottom; each item
has **Steps** and an **Expected** result. Check the box when it passes. Items are tagged **[API]**
(curl/Postman/psql), **[WEB]** (browser), or **[OPS]** (operator). Assumes Phase 1 already
verified ([`PHASE-1-VERIFICATION.md`](./PHASE-1-VERIFICATION.md)).

- **Admin login:** `admin` / `Password1234!`. **API base:** `http://<host>/api/v1` · **Swagger:** `/api/docs`
- **Web base:** `http://<host>/` (redirects to `/id-ID`). Monitoring nav requires `monitoring:read`.
- Docker is the operator's environment; none of this runs in the dev WSL.

---

## P · Prerequisites  [OPS]

- [ ] **P1. Stack up & migrated.** Backend boots with `prisma migrate deploy` (never `migrate dev`).
  Confirm the rollup tables exist:
  `docker compose exec postgres psql -U swat -d swat -c '\dt "DailyTonnage" "MonthlyTonnageBySource" "MonthlyTonnageBySite" "DailyFuelByVehicle" "MonthlyRouteActivity" "ArchiveCatalog"'`
  → all six listed.
- [ ] **P2. Seed.** Run `pnpm db:seed`. **Expected:** 6 waste sources (`D`/`R`/`PS`/`PU`/`PL`/`S`),
  demo vehicles mapped to sources via `VehicleWasteSource` (vehicle 1 → Dinas `D`, vehicle 2 → Swasta `S`),
  plus a year of synthetic **disposal + refuel** trips, per-day **TPA weighbridge logs** (a
  MATCHED/DISCREPANCY/PENDING mix), and demo **levy** rows (12 months × 5 categories) so the BBM,
  reconciliation, and Retribusi surfaces all have data. The synthetic pass is idempotent — re-running
  back-fills refuel/TPA/levy onto an already-seeded DB without a wipe.
- [ ] **P3. Backfill rollups.** From inner `swat/`: `pnpm --filter @swat/backend run rollup:backfill`
  (resolves the Trip date range automatically, or pass `YYYY-MM-DD YYYY-MM-DD`). **Expected:** logs
  `{days, months}` processed; idempotent (safe to re-run).

---

## R · Rollups & correctness  [API/OPS]

- [ ] **R1. Daily tonnage matches raw trips.** Pick a date with trips and compare:
  `SELECT amount FROM "DailyTonnage" WHERE date='<d>'` vs
  `SELECT SUM("netWeight") FROM "Trip" t JOIN "Route" r ON r.id=t."routeId" WHERE t."operationDate"='<d>' AND t.status IN ('DONE','VERIFIED') AND r.category='DISPOSAL' AND t."netWeight">0`.
  **Expected:** identical totals.
- [ ] **R2. By-source totals conserve.** `SELECT SUM("totalNetWeight") FROM "MonthlyTonnageBySource" WHERE month='<first-of-month>'`
  equals the month's grand disposal tonnage (multi-source vehicles are attributed to one source via
  `MIN`, never double-counted). See the by-source caveat in `09-modules/monitoring.md` "Known Limitations".
- [ ] **R3. Incremental hook.** Record/verify a trip (`PUT /trips/:id`, `PUT /trips/:id/verify`), then
  re-query `DailyTonnage[operationDate]`. **Expected:** updated within ~1 s, no nightly wait.
- [ ] **R4. Nightly cron idempotent.** Manually invoke the rollup recompute (or wait for `0 23 * * *`),
  run it twice. **Expected:** rollup values unchanged on the second run.

---

## A · Monitoring API (10 endpoints)  [API]

All under `/api/v1/monitoring/`, `monitoring:read` guarded, `ApiResponse<T>` envelope.

- [ ] **A1. tonnage-5day** — `GET /monitoring/tonnage-5day?dateFrom=…&dateTo=…` → daily totals over
  the window (the dashboard passes the last-5-days range; `dateFrom`/`dateTo` are **required** — a
  bare call returns 422). Each row carries its per-day `reconciliationStatus`
  (`MATCHED`/`DISCREPANCY`/`PENDING`, computed on read from `DailyTonnage` vs `TpaInboundLog` — see RC).
- [ ] **A2. tonnage-monthly** — `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` → monthly series.
- [ ] **A3. tonnage-by-source** — verify the toggle: no `group` (Semua) → all six sources;
  `?group=SWASTA` → only code `S`; `?group=NON_SWASTA` → the other five. **Expected:** Semua total =
  SWASTA + NON_SWASTA.
- [ ] **A4. tonnage-by-site**, **A5. fuel-consumption**, **A6. fuel-by-type**, **A7. routes-active**,
  **A8. trip-summary** (paged), **A9. kpi-overview**, **A10. levy-summary** — each returns a 200
  envelope. `levy-summary` is empty until live legacy levy data lands (post-T-155).
- [ ] **A11. Validation.** Malformed shape (`?dateFrom=not-a-date`) → **422**. Impossible-but-shaped
  date (`?dateFrom=2026-13-40`) → **422** (not 500 — regressed once; guarded by `@IsISO8601`).
  Invalid `group` → **422**. (Envelope: `{success:false, error:{code:'VALIDATION_ERROR', details}}`.)
- [ ] **A12. AuthZ.** Call without auth → **401**; with a session lacking `monitoring:read` → **403**.

---

## C · Cache & invalidation  [API/OPS]

- [ ] **C1. Cache hit.** Call any monitoring endpoint twice; second response is materially faster
  (< 100 ms) and `cache:monitoring:*` keys exist in Redis (`KEYS cache:monitoring:*`).
- [ ] **C2. Precise invalidation.** Note keys for date X and date Y. Record a trip on date X.
  **Expected:** only date-X monitoring keys are dropped; date-Y keys survive (per-date invalidation,
  blanket only when operationDate is absent).

---

## RC · TPA reconciliation (Epic 2.4 · T-211)  [API/OPS]

Nightly job `@Cron('30 23 * * *', Asia/Jakarta)` re-checks a trailing window, comparing
trip-derived `DailyTonnage` vs Σ `TpaInboundLog.netWeight` per day; the monitoring API also computes
the same status on read (`tonnage-5day`, A1). Tolerance and rules live in `monitoring.math.ts`.

- [ ] **RC1. MATCHED.** Insert a `TpaInboundLog` total within **±5%** of the day's `DailyTonnage`.
  Run reconciliation (or wait for the cron). **Expected:** day flagged `MATCHED`; `tonnage-5day`
  shows `MATCHED` for that date.
- [ ] **RC2. DISCREPANCY.** Insert a TPA total **> 5%** off. **Expected:** `DISCREPANCY`, and the job
  logs a discrepancy summary (count + dates).
- [ ] **RC3. PENDING.** Leave a day with trips but **no** `TpaInboundLog` row. **Expected:** `PENDING`
  (never silently `MATCHED`). Both-zero days → `MATCHED`.
- [ ] **RC4. Window + idempotent.** Re-run reconciliation twice over the trailing window; statuses are
  stable and the job never throws.

---

## W · Dashboards  [WEB]

- [ ] **W1. Volume** (`/monitoring/volume`) — KPI cards, stacked tonnage columns, source donut, per-site
  table, reconciliation badge. **Semua / Non-Swasta / Swasta** toggle drives every widget.
- [ ] **W2. BBM** (`/monitoring/fuel`) — KPI cards, grouped requested-vs-approved bars (red on variance
  < −5%), vehicle variance table. With the demo seed: `L 0001 SW` ≈ −2% **OK**, `L 0002 SW` ≈ −12%
  **RED** (one vehicle is seeded chronically under-approved so the red flag is visible).
- [ ] **W3. Rute** (`/monitoring/routes`) — KPI cards + route-activity (ritase) table.
- [ ] **W4. Retribusi** (`/monitoring/levy`) — KPI cards + levy table (IDR-formatted). The demo
  seed populates 12 months × 5 categories (Industri/Komersial/Hotel & Restoran/Rumah Tangga/Pasar);
  live legacy levy data replaces it post-T-155.
- [ ] **W5. Date range.** Changing the date range updates all widgets; perceived < 1 s from cache.
- [ ] **W6. Vehicle → source mapping** (`/vehicles` → row action "Kelola Sumber Sampah") — add/remove a
  source for a vehicle; re-run backfill; the by-source breakdown reflects the change.
- [ ] **W7. Dark-mode QA.** All four dashboards + charts legible in dark mode.

---

## X · Archiving lifecycle  [OPS — live-infra, on-prem]

Logic is unit/integration-tested with mocked pg; the real run is operator-gated.

- [ ] **X1. Detach.** Archiving runs on the monthly cron `@Cron('0 1 1 * *', Asia/Jakarta)` (no manual
  API trigger) for partitions > 13 months old. **Expected:** partition detached, `pg_dump` + gzip
  produced, SHA-256 recorded in `ArchiveCatalog`. Aborts if rollups for that period are incomplete;
  idempotent (skips if already cataloged).
- [ ] **X2. Catalog list.** `GET /archiving` (perm `archive:read`) → lists `ArchiveCatalog` rows
  (tableName, period, location, rowCount, checksum, detachedAt).
- [ ] **X3. Reattach.** `POST /archiving/reattach` (perm `archive:manage`) → decompress,
  checksum-verify, `ATTACH PARTITION`, catalog updated. **Expected:** an `AuditLog` entry records the
  reattach (mutation audit).
- [ ] **X4. Dashboards unchanged.** After detach, dashboards for archived periods still load < 1 s
  (served from rollups, never partitions).

---

## Provable-now vs operator-later (recap)

- **Now (CI, no Docker):** rollup math, reconciliation thresholds, cache-key precision, archiving
  logic (mocked pg), DTO validation — backend 458 tests + web 135 tests green, coverage gate
  96/81/96/96 held. See [`phase-2-status.md`](./phase-2-status.md).
- **Operator/live:** `migrate deploy` + seed + backfill, Redis cache timing, real nightly cron,
  partition-pruning `EXPLAIN`, real detach/compress/reattach, live levy data (post-T-155).
