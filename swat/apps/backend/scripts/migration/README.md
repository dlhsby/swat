# Legacy migration (Epic 1.13 — M7)

Scripts that migrate the legacy MySQL `dkp_swat` database (and its image
filesystem) into the new PostgreSQL schema. Spec: [`specs/04-migration.md`](../../../../specs/04-migration.md).

> **Why these live under `apps/backend/scripts/`** (not the monorepo root the spec
> sketches): they reuse the backend's generated Prisma client, `argon2`, the S3
> client, the `tsconfig`, and — for the pure transform/mapper/enum/reconcile
> logic — the backend's Jest runner, so the correctness core is unit-tested in CI.

## What is verified

- ✅ **Pure logic** — enum maps, row mappers, FK resolution, route + crew dedupe,
  keyset pagination + watermark, reconciliation tolerance, permission-key
  derivation, image helpers — under `lib/*.spec.ts` (`pnpm --filter @swat/backend test`),
  plus `lint` + `typecheck`.
- ✅ **End-to-end against a real dump** (`old_swat/db_backup/dkp_swat_2026_05_18_*.sql`
  restored into the `old_swat/infra` MySQL container): the full
  master + auth + scheduling + aggregate load runs green and `migrate:verify`
  passes — 1463 vehicles, 934 sites, 4897 routes, 316 drivers, 67 users, 1396 crew
  schedules, 2128 trip templates, 364 tonnage rows; FK integrity ✓, all row counts
  within tolerance (every drop an accounted-for dedupe).
- ⏳ **Deferred:** the multi-TB **transactional history** stream (T-155) and the
  **image corpus** (needs the on-prem upload filesystem) — see below.

## Scripts

| Script                 | npm task            | Purpose                                                                                      |
| ---------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `migrate-discovery.ts` | `migrate:discovery` | T-151 — read-only profiling → `reports/migration-discovery-report.{json,md}`                 |
| `migrate-legacy.ts`    | `migrate:legacy`    | T-152–158 — load master/auth/scheduling/aggregates (idempotent, `--force-reset`, `--resume`) |
| `migrate-images.ts`    | `migrate:images`    | T-156 — filesystem → S3, SHA-256 verify, `Photo` rows, bounded concurrency                   |
| `verify-migration.ts`  | `migrate:verify`    | T-159 — reconcile counts (≤1%), FK + security checks, report; exit 1 on critical             |

## Environment

```bash
# Legacy source (MySQL)
LEGACY_DB_HOST=...      LEGACY_DB_PORT=3306
LEGACY_DB_USER=...      LEGACY_DB_PASSWORD=...
LEGACY_DB_NAME=dkp_swat
# Target (PostgreSQL) — the backend's standard Prisma connection
DATABASE_URL=postgresql://...
# Images
LEGACY_IMAGE_ROOT=/srv/old_swat/uploads
S3_ENDPOINT=...  S3_REGION=...  S3_BUCKET=swat-photos  S3_ACCESS_KEY=...  S3_SECRET_KEY=...
MIGRATE_IMAGE_CONCURRENCY=5
```

## Dump first — don't migrate from the live DB

Restore a `mysqldump` of prod into a **disposable MySQL container** (the
`old_swat/infra` stack is exactly this) and point the loader at that, rather than
connecting to the operational MySQL:

- **Safety** — the bulk load issues large `SELECT`s; a read-once dump never
  competes with live operations.
- **Reproducibility** — you migrate from a frozen snapshot, so re-runs and
  `migrate:verify` reconcile against immutable data; iterate until clean.
- **Cleansing** — 13y of data has quality issues (see below); you fix them in the
  staging copy, never in prod.

Live-connect is reserved for the final **`delta-sync`** near cutover (freshest few
hours, tiny volume).

## Run order (operator)

```bash
# 0. Target schema + the AUTH bootstrap only — all master/reference data comes
#    from legacy, so seeding reference rows here would collide on unique business
#    keys (e.g. waste-source `code`) and silently drop the legacy rows.
pnpm --filter @swat/backend prisma:deploy
SEED_AUTH_ONLY=true pnpm --filter @swat/backend prisma:seed

# 1. Profile the (staging) DB (read-only) — drives partition/archive decisions.
pnpm --filter @swat/backend run migrate:discovery

# 2. Load master + auth + scheduling + aggregates (idempotent; re-run safe).
pnpm --filter @swat/backend run migrate:legacy
#    Re-run after a failure:        … run migrate:legacy --resume
#    Wipe & re-load (dev/test):     … run migrate:legacy --force-reset

# 3. Migrate the image corpus.
pnpm --filter @swat/backend run migrate:images

# 4. Validate — exits non-zero if any table is >1% off or an FK is orphaned.
pnpm --filter @swat/backend run migrate:verify
```

## Legacy data-quality handling

The loader fails **loud** on unresolved hard FKs (a feature — never a silent bad
row), and applies these specific, logged cleanses for known 13-year-old issues:

- **Duplicate / blank / placeholder plates** (`''`, `Excavator`, re-used plates):
  SWAT enforces a unique plate, so the loader suffixes the legacy id
  (`B9552EQ#1048`, blank → `NOPOL#<id>`) and sets `needsPlateReview=true` — every
  vehicle survives + stays FK-resolvable; ops reconcile the flagged rows in-app.
- **Duplicate `(vehicle, driver)` schedule templates:** deduped (keep first), trip
  templates remapped to the kept schedule — same as the route dedupe.
- **Duplicate `(vehicle, source)` junction rows / links to a dropped row:** skipped
  with a counted warning (soft many-to-many).

`migrate:verify` reports each expected drop so the ≤1% variance check stays fair.

## Design notes

- **Identity:** new PKs are **UUID v7** (`@default(uuid(7))`); the legacy numeric PK
  is stored in `legacyId` (`@unique`). Each parent table is loaded first, then a
  `legacyId → new UUID` map is read back (`toLegacyMap`) and the child mappers resolve
  their FKs through it (`resolveFk`). No sequences to reset — UUID PKs need none.
- **Routes** are deduped on `(origin, destination, category)`; trip templates that
  referenced a dropped duplicate are remapped to the kept route. `verify` accounts
  for the expected drop so the variance check stays fair.
- **Passwords:** legacy MD5 hashes are **never** copied — every migrated user gets
  a random Argon2id hash + `mustChangePassword=true`; temp credentials are
  distributed out-of-band.
- **Transactional history** (`trayek`/`transaksiangkutsampah`/…) is empty in the
  sample snapshot and is the live-only heavy path: stream it with
  `keysetBatches` + a resumable watermark when running against production.

## Deferred — T-155 transactional bulk load (revisit with live data)

The transactional history loader is **intentionally not implemented yet**: those
tables are empty in the master-data-only snapshot, so it cannot be written or
verified against real data in this environment. The reusable building blocks are
already in place and unit-tested — `keysetBatches` + `readWatermark`/`writeWatermark`
(`lib/pagination.ts`), the `mapTripStatus`/`mapDayStatus` enum maps, and the
`legacyId → UUID` FK-resolution helpers (`toLegacyMap`/`resolveFk`). See the
`TODO(T-155 …)` block in `migrate-legacy.ts`.

**When the live DB is available, implement under a `--include-transactions` flag:**

1. `trayek → Trip`, `transaksiangkutsampah → Haul`,
   `detailtransaksiangkutsampah → HaulAssignment`, `sampahmasuktpa → TpaInboundLog`.
2. Stream **oldest → newest** (`ORDER BY` the operation date) in 10k-row keyset
   batches into the **pre-created monthly partitions**; **denormalize
   `operationDate`** onto Haul/HaulAssignment/Trip from the owning
   `TransactionDay.date`.
3. Persist a per-table watermark so `--resume` continues after an interruption;
   `legacyId` guard keeps it idempotent.
4. Build indexes / `ANALYZE` per partition after the bulk load; add **per-year**
   reconciliation rows to `verify-migration.ts` (not just per-table).

Spec: [`specs/04-migration.md`](../../../../specs/04-migration.md) §3.1.
