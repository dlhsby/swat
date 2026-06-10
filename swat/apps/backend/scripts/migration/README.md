# Legacy migration (Epic 1.13 — M7)

Scripts that migrate the legacy MySQL `dkp_swat` database (and its image
filesystem) into the new PostgreSQL schema. Spec: [`specs/04-migration.md`](../../../../specs/04-migration.md).

> **Why these live under `apps/backend/scripts/`** (not the monorepo root the spec
> sketches): they reuse the backend's generated Prisma client, `argon2`, the S3
> client, the `tsconfig`, and — for the pure transform/mapper/enum/reconcile
> logic — the backend's Jest runner, so the correctness core is unit-tested in CI.

## What is verified here vs. deferred

**Docker / a live MySQL / a live PostgreSQL are not available in this dev
environment.** Following the Phase-0/1 "scaffold-all, defer live infra" posture:

- ✅ **Verified locally:** all pure logic — data-quality fixes, enum maps, row
  mappers, route dedupe, keyset pagination + watermark, reconciliation tolerance,
  permission-key derivation, image object-key/content-type helpers — under `lib/*.spec.ts`
  (run by `pnpm --filter @swat/backend test`); plus `lint` + `typecheck`.
- ⏳ **Operator's on-prem step (deferred):** the end-to-end run against the live
  MySQL + PostgreSQL + image filesystem, and the multi-TB transactional history.

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

## Run order (operator)

```bash
# 0. Target schema + canonical roles/permissions/admin must exist first.
pnpm --filter @swat/backend prisma:deploy
pnpm --filter @swat/backend prisma:seed

# 1. Profile the live DB (read-only) — drives partition/archive decisions.
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
