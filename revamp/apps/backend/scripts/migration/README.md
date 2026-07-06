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
- ✅ **End-to-end against a real dump** (the per-table gzip dump at `legacy/db/dump/`,
  loaded into a throwaway MySQL by `infra/seed-legacy-from-dump.sh`): the full
  master + auth + scheduling + aggregate load runs green and `migrate:verify`
  passes — 1463 vehicles, 934 sites, 4897 routes, 316 drivers, 67 users, 1396 crew
  schedules, 2128 trip templates, 364 tonnage rows; FK integrity ✓, all row counts
  within tolerance (every drop an accounted-for dedupe).
- ✅ **Transactional history** (T-155, the `--include-transactions` phase) — full real
  volume from the per-table dump: `haritransaksi`→TransactionDay, `transaksiangkutsampah`
  →Haul (~4.1M), `detailtransaksiangkutsampah`→HaulAssignment (~4.4M), `trayek`→Trip
  (~8M), `sampahmasuktpa`→TpaInboundLog, into the monthly partitions. **Every stage is
  keyset-batched + watermarked** (`--resume`) with **per-batch FK resolution** (the parent
  legacyId→UUID lookup is scoped to each batch, so memory stays flat at full volume — see
  `lib/pagination.ts` `resolveParents`/`fetchExistingLegacyIds`). Idempotent: Haul dedupes
  on its unique `(operationDate, transactionDayId, vehicleId)`; HaulAssignment/Trip have a
  non-unique `legacyId` (partitioned) so each batch skips rows already present. A re-run
  inserts 0; `--force-reset` (with `--include-transactions`) truncates the txn tables +
  resets watermarks first.
- ⏳ **Deferred:** the **image corpus** (needs the on-prem upload filesystem) — see below.

## Scripts

| Script                 | npm task            | Purpose                                                                                      |
| ---------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `migrate-discovery.ts` | `migrate:discovery` | T-151 — read-only profiling → `reports/migration-discovery-report.{json,md}`                 |
| `migrate-legacy.ts`    | `migrate:legacy`    | T-152–158 — load master/auth/scheduling/aggregates (idempotent, `--force-reset`, `--resume`) |
| `migrate-images.ts`    | `migrate:images`    | T-156 — filesystem → S3, SHA-256 verify, `Photo` rows, bounded concurrency                   |
| `verify-migration.ts`  | `migrate:verify`    | T-159 — reconcile counts (≤1%), FK + security checks, report; exit 1 on critical             |
| `delta-sync.ts`        | `migrate:delta-sync`| T-166 — idempotent re-upsert of masters by `legacyId` + KPI-parity report (re-dump delta)    |
| `backfill-rollups.ts`  | `rollup:backfill`   | Recompute `daily_tonnage` + monthly monitoring rollups (full or a date range); after a bulk load |
| `run-archive.ts`       | `archive:run`       | On-demand 13-month partition archiving; pre-flights `pg_dump`/`ARCHIVE_DIR` and no-ops if absent |
| `corridors/run-backfill.ts` | `corridors:backfill` | Default route corridors (idempotent — skips routes that already have one; Google only for new)|

> The dump reseed (`infra/seed-legacy-from-dump.sh`) auto-runs `rollup:backfill` then `archive:run`
> after a transactional load, and supports `--resume`/`--reuse-mysql`/`--retry` — see
> §"Resumable / opt-in flags" and §"Incremental re-dump (delta)".

## Environment

```bash
# Legacy source (MySQL)
LEGACY_DB_HOST=...      LEGACY_DB_PORT=3306
LEGACY_DB_USER=...      LEGACY_DB_PASSWORD=...
LEGACY_DB_NAME=dkp_swat
# Target (PostgreSQL) — the backend's standard Prisma connection
DATABASE_URL=postgresql://...
# Images
LEGACY_IMAGE_ROOT=/srv/legacy/web/uploads
S3_ENDPOINT=...  S3_REGION=...  S3_BUCKET=swat-photos  S3_ACCESS_KEY=...  S3_SECRET_KEY=...
MIGRATE_IMAGE_CONCURRENCY=5
```

## Dump first — don't migrate from the live DB

Restore the committed per-table dump (`legacy/db/dump/`) into a **disposable MySQL
container** and point the loader at that, rather than connecting to the operational
MySQL — `infra/seed-legacy-from-dump.sh <staging|production>` does exactly this
(stand up MySQL 5.7 → import the gz dump → `migrate:legacy` → tear down):

- **Safety** — the bulk load issues large `SELECT`s; a read-once dump never
  competes with live operations.
- **Reproducibility** — you migrate from a frozen snapshot, so re-runs and
  `migrate:verify` reconcile against immutable data; iterate until clean.
- **Cleansing** — 13y of data has quality issues (see below); you fix them in the
  staging copy, never in prod.

Live-connect is reserved for the final **`delta-sync`** near cutover (freshest few
hours, tiny volume).

## Four seed tracks (all additive, idempotent)

Seeding is split into independent, re-runnable tracks:

| Command               | Source                   | What it adds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seed:demo` (default) | synthetic + sampled real | Demo users + per-role logins + a **slim curated master subset** (`prisma/demo-fixtures.ts`, refreshed from `legacy/db/dump/`) + a **sampled slice of REAL legacy transactions** (latest year, demo vehicles — `prisma/demo-transactions.json`) with synthetic transactions filling the remaining days, + 24-mo levies + inspections/maintenance/photos, then an **auto rollup backfill**. No MySQL at seed time. Regenerate fixtures after a re-dump with `infra/refresh-demo-fixtures.sh`. |
| `seed:legacy`         | legacy MySQL             | Full master + auth + scheduling + aggregates. **No transactions, no synthetic.** Local pre-UAT testing on real masters. Self-sufficient (bootstraps its own permissions + `admin`).                                                                                                                                                                                                                                                                                                         |
| `seed:staging`        | legacy MySQL             | Same engine **+ transactional history** (`--include-transactions`). Targets the staging DB via `SEED_ENV=staging` (`infra/env/backend/.env.staging`). For UAT.                                                                                                                                                                                                                                                                                                                              |
| `seed:production`     | legacy MySQL             | Same as staging but `SEED_ENV=production` (`infra/env/backend/.env.production`) + requires `--confirm-production` (the engine refuses otherwise). The real cutover.                                                                                                                                                                                                                                                                                                                         |
| `seed:auth`           | —                        | Internal bootstrap utility: permissions + `admin` + the Administrator role only.                                                                                                                                                                                                                                                                                                                                                                                                            |

- **Two distinct RBACs.** `seed:demo` assigns each role a hand-authored permission set
  (`ROLES` in `prisma/seed.ts`, modelled on the legacy roles). `seed:legacy` instead
  derives each role's grants from the real legacy `hakaksesmenu` menu tree
  (`derivePermissionKeys`), so legacy roles carry exactly their legacy permissions —
  no demo patterns leak in (run it on a clean DB, not on top of `seed:demo`).
- **Legacy logins.** Legacy MD5 is never copied: every migrated user gets
  `LEGACY_SEED_PASSWORD` (default `12345678`) **with a forced first-login reset**,
  so they can sign in (web) to test their mapped RBAC and must then set a real password.
  The bootstrap `admin / 12345678` is likewise forced to reset on first login — only the
  bootstrap `superadmin` (password from `SUPERADMIN_PASSWORD`, full access incl.
  system preferences) is ready to use.
- **Additive, no duplicates, demo login protected.** Demo rows carry no `legacyId`;
  legacy rows are keyed by `legacyId` with `skipDuplicates`. Re-running is a safe no-op
  on what exists (the "already applied" guard warns + proceeds; `--force-reset`
  truncates + reloads). A legacy user colliding with `admin` is imported as
  `admin_legacy70` (`resolveLegacyUsername`, unit-tested) so the bootstrap admin survives.

## Run order (operator — legacy-only / production cutover)

```bash
# 0. Target schema only. The legacy loader bootstraps its own permissions + admin,
#    so no auth seed is required (a separate `db:seed:auth` is optional). Do NOT run
#    the demo seed here — its reference rows would collide on unique business keys
#    (e.g. waste-source `code`) and silently drop the legacy rows.
pnpm --filter @swat/backend prisma:deploy

# 1. Profile the (staging) DB (read-only) — drives partition/archive decisions.
pnpm --filter @swat/backend run migrate:discovery

# 2. Load from the committed dump (legacy/db/dump/). These wrappers stand up a
#    throwaway MySQL, run migrate:legacy against the target, and tear it down.
#    Run from the revamp root. (NODE max-old-space is set by the script; the
#    transactional phase streams in keyset batches so memory stays flat.)
#    Staging/UAT (+ full real transactions), DATABASE_URL from .env.staging:
pnpm seed:staging                 # = infra/seed-legacy-from-dump.sh staging --with-transactions
#    Staging master-only:           pnpm seed:staging:master
#    Production cutover (+ transactions, guarded), DATABASE_URL from .env.production:
pnpm seed:production              # = …seed-legacy-from-dump.sh production --with-transactions --confirm-production
#    Local pre-UAT against a dev MySQL (no dump helper): pnpm --filter @swat/backend run seed:legacy
#    Wipe & re-load (dev/test):     … run migrate:legacy --force-reset --include-transactions

# 2b. RESUME after any interruption (crash / dropped tunnel / killed process): re-run the
#     SAME seed line with the resumable flags — it continues from the per-batch watermark
#     (apps/backend/scripts/migration/reports/watermark.json) instead of restarting at zero,
#     and reuses the already-loaded MySQL rather than re-importing the dump:
bash infra/seed-legacy-from-dump.sh <env> --with-transactions --transactions-only \
     --resume --reuse-mysql --keep-mysql --retry
#     After a transactional load the seed auto-runs the monitoring rollup backfill then
#     partition archiving (skip with --skip-backfill / --skip-archive). See §"Resumable /
#     opt-in flags" and §"Incremental re-dump (delta)" below.

# 3. Migrate the image corpus.
pnpm --filter @swat/backend run migrate:images

# 4. Validate — exits non-zero if any table is >1% off or an FK is orphaned.
#    (For a windowed load — --since-year — verify reports the out-of-window tables as
#    expected drift; reconcile against the window instead.)
pnpm --filter @swat/backend run migrate:verify
```

## Resumable / opt-in flags (`infra/seed-legacy-from-dump.sh`)

Defaults are unchanged (one-shot `--force-reset`, MySQL torn down on exit). The flags below
make the dump reseed interruption-safe and are what the production cutover should use:

| Flag                    | Effect                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `--resume`              | Continue every stream from its watermark; do **not** `--force-reset` (no truncate).             |
| `--transactions-only`   | Skip master/auth/scheduling/corridor phases; run only the transactional load.                   |
| `--reuse-mysql`         | Reuse an already-loaded ephemeral MySQL (or a populated `LEGACY_MYSQL_DATADIR`) — no re-import.  |
| `--keep-mysql`          | Don't tear the MySQL container down on exit, so the next resume reuses it.                       |
| `--retry[=N]`           | Re-invoke the migrator on failure, resuming from the watermark (self-heals tunnel/RDS blips).    |
| `--since-year=YYYY`     | Window the 5 transactional tables **and** DisposalPermit to this year onward (masters stay full).|
| `--skip-corridors`      | Skip the route-corridor backfill (a no-op that still calls ~17k Google Directions when it runs). |
| `--skip-backfill`       | Don't run the monitoring rollup backfill after the txn load (default: run).                      |
| `--skip-archive`        | Don't run 13-month partition archiving after the backfill (default: run; no-ops without pg_dump).|
| `LEGACY_MYSQL_DATADIR`  | Bind-mount MySQL's datadir to a big disk — keeps the ~10-15 GB import off Docker's/`C:` disk and |
|                         | **persists across a crash** so a resume never re-imports. (env var, not a flag.)                 |

**Post-load (auto, after a transactional load):** the seed runs `rollup:backfill` (populates the
`daily_tonnage` + monthly rollups the monitoring dashboards read — the ETL writes only raw
`haul`/`trip`) then `archive:run`. `archive:run` pre-flights `pg_dump` + a writable `ARCHIVE_DIR`
and **cleanly no-ops if either is absent**, so an over-tunnel staging load never orphans a
detached partition; it archives for real on the on-prem prod box.

Monitor a running load from anywhere (reads the DB, not the log): `bash infra/reseed-progress.sh <env> --watch`.

## Incremental re-dump (delta) — reimport only new data

You do **not** need a full reimport when a fresh dump only adds new days on top of an already-seeded
target. Because the transactional streams are keyset-batched and **watermarked**, a resume loads only
rows with `legacyId` **beyond** the last watermark — i.e. exactly the transactions appended since the
last load. Keep `reports/watermark.json` between loads (it remembers where to continue).

```bash
# 1. New / changed MASTER rows (new vehicles, sites, disposal permits) — idempotent re-upsert
#    by legacyId + a KPI-parity report. (No masters change tracking in legacy → cheap full re-upsert.)
pnpm --filter @swat/backend run migrate:delta-sync

# 2. Only the NEW transactions — resume from the watermark (optionally windowed to the current year):
bash infra/seed-legacy-from-dump.sh <env> --with-transactions --transactions-only \
     --resume --reuse-mysql --since-year=2026

# 3. Refresh monitoring for just the affected day(s) (fast — scope the rollup to a date range):
pnpm --filter @swat/backend run rollup:backfill -- 2026-07-06 2026-07-07
```

- **No corridor backfill, no Google Maps calls** — `--transactions-only` skips corridors, and the
  corridor backfill is idempotent anyway (`repo.hasAny` skips routes that already have a corridor, so
  it only ever calls Google for brand-new routes, never re-snaps existing ones).
- **Caveat — inserts vs edits:** `--resume` catches newly-**appended** rows (higher `legacyId`); it does
  **not** re-pull *edits* to an already-loaded row (its id is below the watermark). For an append-heavy
  daily flow that's fine. To also capture edits to a recent window, reload just that window
  (truncate the recent partitions + `--since-year=<recent>` from watermark 0) rather than a pure resume.
  `migrate:delta-sync` already re-upserts *master* edits; only transactional edits to old rows are the gap.

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
- **Transactional history** is loaded by the `--include-transactions` phase
  (`migrateTransactions`, staging/production only) — see below.

## T-155 transactional history — implemented (`--include-transactions`)

The transactional phase runs only for `seed:staging` / `seed:production` (the
`--include-transactions` flag); `seed:legacy` skips it. In FK order:

| Legacy table                  | → SWAT table     | Notes                                                                                                                                                                                                                        |
| ----------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `haritransaksi`               | `TransactionDay` | keyset-batched + watermarked (`transaction_day`)                                                                                                                                                                             |
| `transaksiangkutsampah`       | `Haul`           | `operationDate` denormalized from the day; `legacyId`-idempotent                                                                                                                                                             |
| `detailtransaksiangkutsampah` | `HaulAssignment` | driver + odometer/time rekap; schedule-template FK optional                                                                                                                                                                  |
| `trayek`                      | `Trip`           | route FK optional; weights/fuel/odometer mapped                                                                                                                                                                              |
| `sampahmasuktpa`              | `TpaInboundLog`  | keyset-batched **raw insert** (the `operation_date` partition key is absent from the Prisma model); `DD-MM-YYYY` label parsed via `parseDmyDate`; chunked to stay under PG's 32767 bind-var cap; watermark `tpa_inbound_log` |

- **Idempotent + resumable:** each stage skips rows already present; `--resume` continues
  every stream from its watermark (`transaction_day`, `haul`, `haul_assignment`, `trip`,
  `disposal_permit`, `tpa_inbound_log`).
- **Reusable building blocks:** `keysetBatches` + `readWatermark`/`writeWatermark` +
  `resolveParents`/`fetchExistingLegacyIds`/`distinctKeys` (`lib/pagination.ts`), the
  `mapTripStatus`/`mapDayStatus` enum maps, `parseDmyDate` (`lib/transforms.ts`), and the
  `legacyId → UUID` helpers (`toLegacyMap`/`resolveFk`).
- **Partitions & archiving:** the partition window 2013-01..2026-12 (+ DEFAULT) is
  pre-created by `20260608000100_partition_transactions`, so a full historical load needs
  no partition pre-creation (the loader warns if any `operationDate` falls outside it).
  Run `migrate:verify` **before** the archiving cron detaches old months — its live
  partitioned counts exclude detached partitions, so an archived month reads as a
  shortfall. Never reload an archived period without re-attaching it first (a detached
  month's inserts route to `*_default`). Follow-up: `ANALYZE` per partition after a large load.

Spec: [`specs/04-migration.md`](../../../../specs/04-migration.md) §3.1.
