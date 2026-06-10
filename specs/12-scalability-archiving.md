# 12 — Scalability, Archiving, Caching & Object Storage

**Why this document exists:** SWAT has been in production **since 2013**. Each operational day it
records **thousands of trips** (`Trip` rows) plus driver/site/disposal **photos**, alongside
weighbridge logs (`TpaInboundLog`) and fuel-quota issuance (`jatahkitir` reached an
AUTO_INCREMENT high-water of ~3.3M historically). Over 10+ years that is **tens of millions of
transactional rows and a large image corpus**. The MVP must stay fast for **daily operational
entry** while still letting reporting/monitoring reach **all historical years**.

This doc is the **single source of truth** for: data-growth sizing, table partitioning, the
hot/warm/cold **archiving** strategy, the unified **caching** strategy (it supersedes the scattered
caching notes in `09-modules/monitoring.md`, `09-modules/reports.md`, `10-nonfunctional.md`, and
`05-architecture.md` — those should defer here), and **object storage** for images.

---

## 1. Data-growth model (sizing)

Rough estimate to design against (tune with real numbers during migration discovery, §7):

| Stream | Per day | Per year | 13 years (2013→2026) |
|--------|--------:|---------:|---------------------:|
| `Trip` (legs: depart/refuel/pickup/disposal/return) | ~3,000–8,000 | ~1.5–2.5M | **~20–30M** |
| `HaulAssignment` | ~1,000–2,000 | ~0.5M | ~6M |
| `Haul` | ~800–1,500 | ~0.4M | ~5M |
| `TpaInboundLog` (weighbridge) | ~1,000–3,000 | ~0.7M | ~9M |
| `FuelQuota` (kitir) | ~1,000 | ~0.3M | ~3.3M (matches legacy) |
| `DailyTonnage` (aggregate) | 1 | 365 | ~4.7k |
| **Trip photos** | ~3,000–10,000 files | ~2M files | **~25M files / multiple TB** |

**Design implications:**
- Transactional tables must be **partitioned** so daily writes and current-period reads never scan
  the full history.
- Photos must **never** live in the DB or app server — use **object storage** with lifecycle tiers.
- Reporting/monitoring read **pre-aggregated rollups + cache**, not raw history, by default.

---

## 2. Partitioning strategy (PostgreSQL native range partitioning)

Partition the large append-only transactional tables **by date**, monthly, with yearly grouping for
archival. PostgreSQL declarative partitioning + `pg_partman` for automated rollover.

### Tables to partition (by an indexed date key)

| Table | Partition key | Granularity | Rationale |
|-------|---------------|-------------|-----------|
| `Trip` | `operationDate` (denormalized from `HaulAssignment`) | **monthly** | highest volume; queried by date range |
| `HaulAssignment` | `operationDate` (denormalized from `Haul`) | monthly | follows Trip |
| `Haul` | `operationDate` (denormalized from `TransactionDay`) | monthly | follows Trip |
| `TpaInboundLog` | `date` | monthly | weighbridge history |
| `DisposalPermit` | `validFrom` | yearly | lower volume, range lookups (was `FuelQuota`) |

> **Schema note:** per [`03-data-model.md`](./03-data-model.md) §8, `Haul`, `HaulAssignment`, and `Trip` each have a denormalized,
> non-null `operationDate DATE` (copied from the owning `TransactionDay.date`) as the **partition key**.
> This avoids join-based pruning; indexes are local to each partition and fast.

### Partition mechanics
- Parent table is `PARTITION BY RANGE (operationDate)`; children are monthly
  (`trip_y2026m06`, …). `pg_partman` pre-creates upcoming partitions and retires old ones.
- Local indexes per partition (PK, FK, `status`, date) — PostgreSQL maintains them per child.
- **Partition pruning** means daily operational queries (filtered to today/this-week) touch one or
  two partitions only.
- Prisma does not manage partitioning; create it via **raw SQL migrations** (`prisma migrate` with a
  hand-written SQL step). Document the DDL in the migration; Prisma models still map to the parent
  table transparently.

### Constraint caveat
Cross-partition unique constraints must include the partition key. Per [`03-data-model.md`](./03-data-model.md) §6, `Haul`'s
unique constraint is `@@unique([operationDate, transactionDayId, vehicleId])` to span partitions.

---

## 3. Archiving strategy (hot / warm / cold)

Goal: **previous-year data is archived** so it does not slow daily operations, **yet remains fully
queryable** for reporting and monitoring.

### Tiers

| Tier | Window | Storage | Access pattern | Performance target |
|------|--------|---------|----------------|--------------------|
| **Hot** | Current + previous month | Live partitions on primary PG, fully indexed, in cache working set | Operational reads/writes (data entry, today's board) | < 100 ms p95 |
| **Warm** | Current year (older months) | Live partitions on primary PG | Recent reporting/monitoring | < 500 ms |
| **Cold (archive)** | Previous years (e.g. > 13 months) | Detached partitions, compressed, on cheaper storage; **rollups always available** | Historical reports, audits, year-over-year | seconds OK; mostly served from rollups |

### How archiving works (no data loss, still accessible)
1. **Rollups first.** Before a period is archived, ensure all aggregates needed by reporting/
   monitoring are materialized (see §4): `DailyTonnage`, plus per-month/site/wasteSource/fuel
   summary tables. These are **never archived** — they are small and stay hot forever, so dashboards
   and year-over-year reports keep working without touching raw history.
2. **Detach, don't delete.** At year-end (or on a 13-month rolling window), old monthly partitions
   are `DETACH PARTITION`ed from the live parent and moved to an **archive schema**
   (`archive.trip_y2019m*`) or a separate **archive database**. Raw rows are preserved.
3. **Querying cold data.** Two supported paths:
   - **Default (fast):** reporting/monitoring read from rollup tables → cover 100% of standard
     dashboards and reports across all years.
   - **Drill-down (on demand):** when a user explicitly opens a historical *raw* record, the API
     reads the archive schema (or, if a separate archive DB, via a read-only connection or
     `postgres_fdw` foreign tables that make `archive.trip_*` transparently queryable).
4. **Operational isolation.** The live parent table only ever holds hot+warm partitions, so daily
   inserts, the haul board, and "today/this-week" queries never scan archived years.

### Archive jobs
- **Scheduled monthly job** (cron, e.g. 2 AM UTC via `@nestjs/schedule`): verify rollups complete for the target period → detach
  partition older than the retention window → compress (`pg_dump`/`COPY` to compressed table or
  columnar storage) → register in an `ArchiveCatalog` table (period, location, row count, checksum).
- **Idempotent and reversible:** re-attach is supported for corrections. Re-run of the archive job skips already-archived periods.
- **Failure handling:** on rollup verification failure, alert (do not detach); on compression failure, alert and log for manual inspection.
- Each step logged; produces an archive report (mirrors the migration report pattern).

### Retention policy (proposed; confirm with DLH)
- Raw transactional rows: keep online (hot+warm) for **13 months**, archived (cold) **indefinitely**
  (government record-keeping).
- Rollups/aggregates: **indefinite**, always hot.
- Trip photos: hot for **13 months**, then object-storage cold tier (§6), retained per DLH policy.

---

## 4. Aggregation / rollup layer (the backbone of reporting at scale)

Reporting and monitoring must **not** aggregate raw history on demand. Maintain rollup tables,
incrementally updated, that survive archiving.

| Rollup | Grain | Source | Refresh strategy |
|--------|-------|--------|---------|
| `DailyTonnage` (exists) | date | Σ `netWeight` of DONE/VERIFIED `DISPOSAL` trips | incremental on trip verify + nightly batch (2 AM UTC, reconcile trailing 3 days) |
| `MonthlyTonnageBySource` | month × wasteSource | trips × vehicle waste source | nightly batch (2 AM UTC) |
| `MonthlyTonnageBySite` | month × site (TPS/TPA) | trips × route endpoints | nightly batch (2 AM UTC) |
| `DailyFuelByVehicle` / `…ByFuelType` | date × vehicle/fuel | Σ `fuelApprovedLiters` of REFUEL trips | nightly batch (2 AM UTC, reconcile trailing 3 days) |
| `MonthlyRouteActivity` | month × route | trip counts (ritase) | nightly batch (2 AM UTC) |

- Implement as **regular tables** updated by jobs (preferred over `MATERIALIZED VIEW REFRESH` at
  this volume, because incremental upserts are cheaper than full refresh). Materialized views are
  acceptable for smaller rollups.
- Updated by: (a) **incremental** triggers/interceptors on trip state changes (trip verify) for "today", and
  (b) a **nightly batch job** (cron, 2 AM UTC) that recomputes the trailing 3 days to detect missed updates.
  Log any gaps; alert on repeated failures.
- All monitoring/report queries hit rollups + cache first; raw drill-down is the exception.

---

## 5. Caching strategy (UNIFIED — supersedes scattered notes)

Layered caching. This table is canonical; other specs reference it.

| Layer | What | Tech | TTL / invalidation | Phase |
|-------|------|------|--------------------|-------|
| **HTTP / CDN** | Static assets, immutable JS/CSS | CDN + `Cache-Control: max-age=31536000, immutable` | content-hashed filenames | 1 |
| **API responses** | Live operational data (lists, a haul board) | none | `Cache-Control: no-store` — always live | 1 |
| **Client** | Server state in the browser | TanStack Query | `staleTime` 60s lists / 5 min reference data; invalidate on mutation | 1 |
| **Reference data** | Enums, sites, vehicles, fuels (slow-changing) | Redis | TTL 1h; **invalidate on write** to that entity | 1–2 |
| **Dashboard KPIs / aggregates** | Monitoring tiles, charts | Redis | key `monitoring:<metric>:<range>:<filters>`; TTL 15 min; **invalidate on trip verify** for current period | 2 |
| **Report artifacts** | Generated Excel/PDF | Object storage | keyed by (report, params, dataVersion); expire 7 days | 3 |
| **Session / rate-limit** | Auth sessions, throttle counters | Redis (or PG for MVP) | per auth spec | 1 |

### Rules
- **Operational/transactional reads are never cached server-side** (correctness > speed for data
  entry). Speed there comes from partitioning + indexes, not caching.
- **Aggregated/historical reads are cached aggressively** and backed by rollups, because they are
  read-heavy and tolerate minutes of staleness.
- **Invalidation is event-driven:** a NestJS interceptor on write endpoints publishes
  cache-invalidation for affected keys (e.g. verifying a trip invalidates that day's monitoring KPI
  keys and bumps the rollup `dataVersion`).
- **Redis is introduced in Phase 1** for sessions/rate-limit/reference-data (it's in the compose
  stack from Phase 0); aggregate caching turns on with monitoring in Phase 2.

---

## 6. Object storage for images (photos)

Legacy stores photo **paths** in `varchar(1024)` columns (`PENGGUNA_FOTO`, `SPOT_FOTO`,
`PENGEMUDI_FOTO`, `dokumentasitrayek`, etc.); files sit on the PHP server's filesystem. At ~millions
of trip photos this must move to dedicated object storage.

### Design
- **Store:** S3-compatible object storage — **MinIO** self-hosted (on-prem/VM, matches DLH infra) or
  a managed S3/GCS. Buckets: `swat-photos` (originals), `swat-thumbnails`, `swat-reports`.
- **DB keeps only the object key**, not the binary and not a brittle absolute path:
  `Trip.photos[].objectKey`, plus `contentType`, `sizeBytes`, `width/height`, `checksum`.
- **Upload flow:** client requests a **pre-signed PUT URL** from the API (authz checked), uploads
  directly to object storage (bypassing the app server), then confirms; API persists the metadata
  row. Downloads use **pre-signed GET URLs** (short-lived) or a CDN with signed cookies.
- **Thumbnails:** generate on upload (async worker) for fast grid/list rendering; serve thumbnails in
  tables, originals on demand.
- **Lifecycle tiers (matches §3 archiving):** Standard for hot (≤13 months) → Infrequent-Access /
  cold (Glacier-equivalent or MinIO tiering) for older photos. Lifecycle rules on the bucket.
- **Integrity & security:** server-side encryption at rest, checksum on upload, virus/MIME
  validation, max-size limits, private buckets (no public read).
- **Migration of legacy images:** see [`04-migration.md`](./04-migration.md) §10 —
  copy files from the legacy filesystem into object storage, rewrite paths to object keys, verify
  checksums and counts.

### Schema impact (feeds [`03-data-model.md`](./03-data-model.md))
Replace `photo String?` URL columns with a generic `Photo`/attachment relation:
```prisma
model Photo {
  id          BigInt   @id @default(autoincrement())
  objectKey   String   @unique @db.VarChar(512)   // bucket-relative key
  contentType String   @db.VarChar(100)
  sizeBytes   Int
  width       Int?
  height      Int?
  checksum    String   @db.VarChar(64)
  ownerType   String   @db.VarChar(40)            // 'trip' | 'site' | 'driver' | 'user' | 'vehicle' | 'maintenanceItem'
  ownerId     String                              // polymorphic FK: Int or BigInt serialized as string; validate in app
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  @@index([ownerType, ownerId])
}
```
(Implements unified polymorphic `Photo` model (ownerType/ownerId per [`03-data-model.md`](./03-data-model.md) §8): scalar `photo` fields on entities become 0..1 relations to Photo.)

---

## 7. Migration discovery (real numbers before building)

Because the provided dump is a partial snapshot (transaction tables empty), the **first migration
task** is to profile the **live** production DB + image store:
- Real row counts per table per year; daily peak insert rate; largest tables; index sizes.
- Total image count + bytes; path scheme; orphaned/missing files.
- Confirm the partition key, retention window, and archive tier boundaries from real data.
Output feeds the sizing in §1 and the partition/archive config. See
[`04-migration.md`](./04-migration.md) §0.

---

## 8. Operational performance checklist

- [ ] Partitioned `Trip`/`Haul`/`HaulAssignment`/`TpaInboundLog`/`FuelQuota` with monthly/yearly granularity and partition pruning.
- [ ] `operationDate` denormalized + indexed on partitioned tables; Haul unique constraint includes partition key.
- [ ] Rollup tables created and maintained incrementally (on trip verify) + nightly batch (2 AM UTC) reconciliation.
- [ ] Archive job scheduled monthly to detach partitions > 13 months old; rollups retained indefinitely.
- [ ] Reporting/monitoring read rollups + Redis cache, not raw history.
- [ ] Old partitions detached to archive schema/DB; rollups retained; re-attach capability enabled.
- [ ] Photos in object storage with pre-signed URLs, thumbnails, lifecycle tiers; no image bytes in PostgreSQL.
- [ ] Connection pooling (PgBouncer) for high concurrency at daily peak.
- [ ] Read replica (optional, Phase 2+) to offload reporting/monitoring from the operational primary.
- [ ] Index review: every operational query filters on `operationDate` + status (verify with
      `EXPLAIN ANALYZE` against a year of seeded data).

---

## 9. Acceptance criteria

- Daily operational queries (today's haul board, data entry) stay < 100 ms p95 with **10+ years**
  of data present (verified via load test with seeded historical volume).
- A monitoring dashboard for any historical year returns < 1 s from rollups/cache.
- Archiving a year's partitions does not change any reporting/monitoring result (rollups intact) and
  measurably shrinks the live operational table set.
- No image bytes stored in PostgreSQL; all served via object storage.
- The system degrades gracefully if Redis is down (falls back to DB/rollups, just slower).
