# 04 — Migration & Cutover (Data + Application)

"Migrate everything, evaluate & improve." This spec covers **two** migrations:
1. **Data migration** — legacy CodeIgniter 2 / MySQL 5.6 data → new PostgreSQL / Prisma schema, with
   data-quality fixes, security hardening, and **image migration** to object storage.
2. **Application migration & cutover** — replacing the running legacy PHP app with the new
   NestJS + Next.js system: strategy, parallel run, rollback, training, and acceptance.

> ## ⚠️ Critical: the provided dump is NOT the live data
> The sample dump (`dkp_swat_2026_05_18_*.sql`) is a **partial / master-data snapshot** — its core
> transaction tables (`transaksiangkutsampah`, `detailtransaksiangkutsampah`, `trayek`) and all
> `riwayat*`/`dokumentasi*` tables are **empty**. But **SWAT has run in production since 2013** and
> records **thousands of trips and photos every day** — i.e. **tens of millions of transactional
> rows and a multi-terabyte image corpus** in the live database/filesystem.
>
> Therefore the migration plan below is written against the **live production system**, not the
> snapshot. The first task (§0) is a **migration discovery** to obtain real volumes, which drive the
> partitioning/archiving design in [`12-scalability-archiving.md`](./12-scalability-archiving.md).
> The row counts elsewhere in this doc come from the snapshot and are placeholders for master data
> only.
>
> **Status:** the §3.1 streamed transactional loader is now implemented behind
> `migrate-legacy.ts --include-transactions` (run by the `seed:staging` / `seed:production` tracks):
> `haritransaksi`→TransactionDay, `transaksiangkutsampah`→Haul, `detailtransaksiangkutsampah`→
> HaulAssignment, `trayek`→Trip, `sampahmasuktpa`→TpaInboundLog — keyset-batched, watermarked
> (`--resume`), idempotent by `legacyId`. See `scripts/migration/README.md` §T-155.

## 0. Migration discovery (do this FIRST)

Before writing any loader, profile the **live** MySQL DB + image store (read-only):
- Exact row counts **per table per year**; daily peak insert rate; total DB size; largest tables and
  index sizes; min/max dates per transactional table.
- Image inventory: total file count + total bytes, directory/path scheme, naming, orphaned rows
  (DB path with no file) and orphaned files (file with no DB row).
- Data-quality scan at scale: count of zero-dates, `(0,0)` GPS, bogus years, duplicate routes,
  encoding anomalies, FK orphans.
- Output: a **discovery report** that sets the real numbers for sizing (§1 of doc 12), the partition
  boundaries, the archive retention window, and a realistic cutover runbook + timing.
- Deliverable: `scripts/migrate-discovery.ts` (read-only) producing a JSON/Markdown report.

## 1. Source & target

### Source
- **Location:** `../old_swat/db_backup/dkp_swat_2026_05_18_structure.sql` + `dkp_swat_2026_05_18_data.sql`
- **DB:** MySQL 5.6, database `dkp_swat`, 44 tables, latin1 charset.
  - *In the snapshot:* ~22k rows (master data only); transaction tables empty.
  - *In live production:* tens of millions of rows across `trayek`/`detailtransaksiangkutsampah`/
    `transaksiangkutsampah` and `sampahmasuktpa`, growing daily since 2013, **plus a large image
    filesystem**. The loader must handle these by **streamed, batched, resumable** ingestion (§3.1),
    not single in-memory passes.
- **Data quality issues (to fix):**
  - Passwords stored as MD5 (plaintext hashes, no salt).
  - Default dates as `0000-00-00 00:00:00`.
  - Bogus values: `KENDARAAN_TAHUNPEMBUATAN=1900`, GPS coordinates `(0,0)`.
  - latin1 encoding (non-ASCII names may be corrupted).
  - Duplicate `rute` rows (same origin, destination, category).
  - MyISAM tables (`sampahmasuktpa`, `konversi_si_swat`) without FK constraints.

### Target
- **DB:** PostgreSQL 15+ (in Docker), connected via Prisma ORM.
- **Schema:** per [`03-data-model.md`](./03-data-model.md).
- **Charset:** UTF-8.
- **Audit trail:** every table has `createdAt`, `updatedAt`, `createdById`/`updatedById`.
- **Soft delete:** master entities (Vehicle, Driver, Site, Route, User, Role) have `deletedAt`.
- **Legacy traceability:** every migrated row preserves its `legacyId` (indexed, nullable).

## 2. ETL approach

### High-level flow
1. **Stage:** read legacy SQL dump(s) or connect to a temporary MySQL instance.
2. **Transform:**
   - Enum mapping: map legacy numeric lookup IDs to new enum strings.
   - Date/time fixes: `0000-00-00` → `NULL`, encode datetimes as UTC `timestamptz`.
   - Value validation: reject or NULL out-of-range/bogus values.
   - Denormalization: for `Haul`/`HaulAssignment`/`Trip`, populate `operationDate` from the owning `TransactionDay.date` (see §3.1).
   - Deduplication: handle duplicate routes.
   - Encoding: latin1 → UTF-8.
3. **Load:** via Prisma `createMany()` / `create()` in dependency order.
4. **Verify:** row-count reconciliation, FK integrity, generated report.

### Implementation: TypeScript script
**Location:** `scripts/migrate-legacy.ts` (monorepo root).

**Invocation:**
```bash
# One-shot migration (safe idempotency guard: checks if legacy data already present)
pnpm exec ts-node scripts/migrate-legacy.ts

# Full truncate + re-migrate (for dev/test reset)
pnpm exec ts-node scripts/migrate-legacy.ts --force-reset
```

**Architecture:**
```typescript
import { PrismaClient } from '@prisma/client'
import * as mysql from 'mysql2/promise'

const prisma = new PrismaClient()

// Main flow:
async function migrate() {
  const mysqlConn = await mysql.createConnection({ host, user, password, database })
  
  // 1. Validate idempotency (check if already migrated)
  const existingLegacy = await prisma.user.findFirst({ where: { legacyId: { not: null } } })
  if (existingLegacy && !forceReset) throw new Error('Already migrated; use --force-reset')
  
  // 2. Seed enums & lookup tables (no legacy IDs; constant data)
  await seedSiteTypes()
  await seedRouteCategories()
  await seedTripStatuses()
  // ... etc
  
  // 3. Migrate in dependency order (see §3 below)
  await migrateStep(1, 'VehicleApplication', ...)
  await migrateStep(2, 'VehicleModel', ...)
  // ... sequence as per table order
  
  // 4. Reconcile & report
  await reconcileRowCounts()
  console.log(report)
}
```

## 3. Dependency order & table-by-table reconciliation

Each table is migrated after its FK dependencies. **Order:**

| Step | Legacy table | New model(s) | Notes |
|------|--------------|-------------|-------|
| **Phase A: Enums & independent lookups** | — | — | — |
| 1 | `kategorispot` | SiteType (enum) | seeded constant |
| 2 | `kategorirute` | RouteCategory (enum) | seeded constant |
| 3 | `statuskendaraan` | VehicleStatus (enum) | seeded constant |
| 4 | `statuskepegawaian` | EmploymentStatus (enum) | seeded constant |
| 5 | `statustrayek` | TripStatus (enum) | seeded constant |
| 6 | `statusdisposalPermit` | DisposalPermitStatus (enum) | seeded constant (was `statusjatahkitir`) |
| 7 | `statusriwayatperawatan` | MaintenanceStatus (enum) | seeded constant |
| 8 | `kategoribahanbakar` | FuelCategory | table; ~2 rows (Bersubsidi, Non-Subsidi) |
| 9 | `bahanbakar` | Fuel | table; ~6 rows; FK to FuelCategory |
| 10 | `sim` | LicenseClass | table; ~7 rows (A, BI, BII, C, D…) |
| 11 | `aplikasikendaraan` | VehicleApplication | table; ~251 rows |
| **Phase B: Master — Geography** | — | — | — |
| 12 | `spot` | Site | table; 934 rows; fix (0,0) GPS → NULL |
| 13 | `rute` | Route | table; ~4,944 rows; **dedupe** on (originSiteId, destinationSiteId, category) |
| 14 | `kategorisumbersampah` | WasteSource | table; ~6 rows (D, R, PS, PU, PL, S) |
| **Phase C: Master — Fleet** | — | — | — |
| 15 | `kategorikendaraan` | VehicleModel | table; 251 rows; FK to aplikasikendaraan, bahanbakar; fix TAHUNPEMBUATAN=1900 → NULL |
| 16 | `kendaraan` | Vehicle | table; 1,463 rows; FK to spot (pool), kategorikendaraan; validate currentOdometer/currentTareWeight ≥ 0 |
| 17 | `kategorisumbersampahkendaraan` | VehicleWasteSource | table; 1,466 rows; FK to kendaraan, kategorisumbersampah |
| **Phase D: Master — Personnel** | — | — | — |
| 18 | `pengemudi` | Driver | table; 316 rows; FK to spot (pool); fix empty dates → NULL |
| 19 | `kepemilikansim` | DriverLicense | table; 14 rows; FK to pengemudi, sim |
| **Phase E: Auth** | — | — | — |
| 20 | `hakakses` | Role | table; 17 rows; map legacy names (see auth spec) |
| 21 | `menu` | (dropped; see auth spec) | replaced by Permission/RolePermission |
| 22 | `hakaksesmenu` | (processed → RolePermission) | see §4 (RBAC algorithm) |
| 23 | — | User | **handcrafted** from legacy `pengguna` (see §5) |
| **Phase F: Scheduling templates** | — | — | — |
| 24 | `masterdetailtransaksiangkutsampah` | CrewSchedule | table; 1,411 rows; FK to kendaraan, pengemudi |
| 25 | `mastertrayek` | TripTemplate | table; 2,128 rows; FK to masterdetailtransaksiangkutsampah, rute |
| 26 | `jatahkitir` | DisposalPermit | 0 in snapshot / **~3.3M live** | batched streamed load (§3.1); partitioned yearly |
| **Phase G: Transactions (empty in snapshot)** | — | — | — |
| 27 | `haritransaksi` | TransactionDay | 4,413 rows structure only / **millions live** | map `statusharitransaksi` → `DayStatus` (IN_PROGRESS, DONE) |
| 28 | `transaksiangkutsampah` | Haul | 0 in snapshot / **millions live** | map `statustransaksiangkutsampah` → `DayStatus`; denormalize `operationDate` from TransactionDay.date; batched streamed load (§3.1); partitioned monthly |
| 29 | `detailtransaksiangkutsampah` | HaulAssignment | 0 in snapshot / **millions live** | map `statusdetailtransaksiangkutsampah` → `DayStatus`; denormalize `operationDate` from Haul.operationDate (which derives from TransactionDay.date); batched streamed load (§3.1); partitioned monthly |
| 30 | `trayek` | Trip | 0 in snapshot / **tens of millions live** | keep `statustrayek` → `TripStatus` (IN_PROGRESS, DONE, VERIFIED); denormalize `operationDate` from HaulAssignment.operationDate; batched streamed load (§3.1); partitioned monthly |
| **Phase H: External / aggregates** | — | — | — |
| 31 | `sampahmasuktpa` | TpaInboundLog | table; 11,171 rows / **~9M live** | MyISAM → normal; nullable fields; fix dates; batched streamed load (§3.1); partitioned monthly |
| 32 | `tonase` | DailyTonnage | table; 364 rows; preserve amount as BigInt |
| 33 | `retribusi` | Levy | table; 134 rows; fix date/amount nullability |
| **Phase I: Helpers** | — | — | — |
| 34 | `konversi_si_swat` | LegacyNameMap | table; 31 rows; MyISAM → normal |
| **Phase J: Maintenance (empty in snapshot)** | — | — | — |
| 35 | `riwayatperawatan` | MaintenanceRecord | 0 in snapshot / **live unknown** |
| 36 | `detailriwayatperawatan` | MaintenanceItem | 0 in snapshot / **live unknown** |
| **Phase K: Dropped (replaced)** | — | — | — |
| — | `dokumentasikendaraan` | (dropped) | generalized to unified Photo model (ownerType='vehicle', ownerId=vehicleId); see §8 & [`03-data-model.md`](./03-data-model.md) §8 |
| — | `dokumentasitrayek` | (dropped) | replaced by unified Photo model (ownerType='trip', ownerId=tripId); see §8 & [`03-data-model.md`](./03-data-model.md) §8 |
| — | `dokumentasidetailriwayatperawatan` | (dropped) | (empty in legacy) |
| — | `statusmenu` | (dropped) | replaced by Permission/RolePermission (see auth spec) |

### Notes

- **Idempotency:** script detects presence of `legacyId` values; on re-run (without `--force-reset`),
  skips already-migrated data.
- **Foreign key constraints:** enforced by Prisma; failing FKs during load = transaction rolls back.
- **Timestamps:** all new `createdAt`/`updatedAt` set to migration timestamp (e.g. `2026-06-05T14:30:00Z`).
- **User attribution:** `createdById`/`updatedById` set to a system admin user (created separately).

### 3.1 High-volume transactional load (live data — overrides the "skip; empty" rows above)

The "empty in data" notes on `trayek`/`detailtransaksiangkutsampah`/`transaksiangkutsampah`/
`riwayat*`/`jatahkitir` apply **only to the snapshot**. Against the live DB these are the **largest** tables and
**must** be migrated:
- **Streamed & batched:** read with a server-side cursor / keyset pagination (by PK or date),
  transform in chunks (e.g. 10k rows), bulk-insert with `COPY`/`createMany`. Never load a whole
  table into memory.
- **Resumable & idempotent:** persist a per-table watermark (last migrated legacy PK/date) so a
  failed run resumes; re-running skips already-loaded rows (`legacyId` guard).
- **Partition-aware:** load into the **partitioned** PostgreSQL tables (see
  [`12-scalability-archiving.md`](./12-scalability-archiving.md) §2). Pre-create all historical
  monthly partitions (2013→present) before loading; **denormalize and populate `operationDate`
  from the owning `TransactionDay.date`** on Haul, HaulAssignment, and Trip rows.
- **Performance:** load with FKs/indexes deferred or built **after** bulk load per partition;
  `SET session_replication_role = replica` during load, then re-validate; `ANALYZE` afterward.
- **Order within history:** migrate oldest→newest so archiving (see [`12-scalability-archiving.md`](./12-scalability-archiving.md) §3) can run immediately after.
- **Reconciliation by partition:** row counts compared per year/partition, not just per table (§8); verify FK integrity across partitions.

## 4. Data-quality fixes

### Dates
```typescript
// Legacy: 0000-00-00 00:00:00 → NULL
const fixDate = (d: string | null) => 
  d && d !== '0000-00-00' && d !== '0000-00-00 00:00:00' ? new Date(d) : null
```

### Manufacture year
```typescript
// Bogus 1900 → NULL; valid 1960–current+1 year
const fixYear = (y: number | null) =>
  y && y >= 1960 && y <= new Date().getFullYear() + 1 ? y : null
```

### Coordinates (GPS)
```typescript
// (0, 0) or out-of-range → NULL
const fixGPS = (lat: number | null, lng: number | null) => {
  const isValidLat = (v) => v && v !== 0 && Math.abs(v) <= 90
  const isValidLng = (v) => v && v !== 0 && Math.abs(v) <= 180
  return {
    latitude: isValidLat(lat) ? new Decimal(lat) : null,
    longitude: isValidLng(lng) ? new Decimal(lng) : null,
  }
}
```

### Numeric ranges
- Odometer, tare weight, distances: reject negative values (set to 0 or NULL based on context).
- Weights (gross, net, tare): reject negative; `net = gross − tare` computed server-side.

### Deduplication: routes
```typescript
// Legacy rute: may have duplicate (RUTE_SPOT_ASAL, RUTE_SPOT_TUJUAN, KATEGORIRUTE_ID) triples
const dedupeRoutes = async () => {
  const routes = await legacyQuery('SELECT * FROM rute')
  const unique = new Map<string, Route>()
  routes.forEach(r => {
    const key = `${r.RUTE_SPOT_ASAL}|${r.RUTE_SPOT_TUJUAN}|${r.KATEGORIRUTE_ID}`
    if (!unique.has(key)) unique.set(key, r)
    // else skip duplicate; log it
  })
  return Array.from(unique.values())
}
```

### Character encoding
```typescript
// MySQL is latin1; Node.js strings are UTF-16 internally
// Dump file should already be re-encoded UTF-8 by the dump tool
// Fallback: iconv-lite for any remaining mojibake
import iconv from 'iconv-lite'
const fixEncoding = (s: string) => iconv.decode(Buffer.from(s, 'latin1'), 'utf-8')
```

## 5. Security: user & password handling

### Rule: NEVER migrate MD5 hashes

Legacy `pengguna` table has 67 users with plaintext MD5 hashes in `PENGGUNA_PASSWORD`.
**Action:** DO NOT copy these.

**Migration reality (implemented in `scripts/migration/migrate-legacy.ts`):** MD5 is never copied. Every migrated user gets a shared seed password — `LEGACY_SEED_PASSWORD` (default `Password123!`) — with `mustChangePassword = true`, so they can sign in (web) to validate their mapped RBAC and are forced to set a real password via `/auth/change-password` (the bearer/native endpoint refuses them until they do). The loader is self-sufficient: `ensureAuthBootstrap()` also seeds the permission catalog + a full-access, ready-to-use `admin / Password123!`, and users are **upserted by username** with any collision against the bootstrap admin suffixed (`admin` → `admin_legacy70`, via `resolveLegacyUsername`). For a real production cutover, override `LEGACY_SEED_PASSWORD` and distribute per-user temporary passwords out-of-band (never in logs). See [`06-auth-rbac.md`](./06-auth-rbac.md) §1.5.1 for the forced-reset flow.

### New user creation
Role mapping from legacy to new system (see [`06-auth-rbac.md`](./06-auth-rbac.md) for the complete role model):
```typescript
async function migrateUsers() {
  const legacyUsers = await legacyQuery('SELECT * FROM pengguna')
  
  for (const lu of legacyUsers) {
    // 1. Derive role from legacy hakakses (map via legacy ID to new role)
    const legacyRole = await legacyQuery(
      `SELECT HR.HAKAKSES_ID, HR.HAKAKSES_NAMA FROM hakakses HR 
       JOIN pengguna P ON P.HAKAKSES_ID = HR.HAKAKSES_ID 
       WHERE P.PENGGUNA_ID = ?`, [lu.PENGGUNA_ID]
    )
    // 2. Look up new role by legacy ID
    const role = await prisma.role.findUnique({ where: { legacyId: legacyRole.HAKAKSES_ID } })
    
    if (!role) {
      console.warn(`No new role found for legacy user ${lu.PENGGUNA_ID}; skipping.`)
      continue
    }
    
    // 3. Hash the shared SEED_PASSWORD ONCE (argon2 is costly), reused for every user.
    //    Forces a reset on first login; MD5 is never copied.
    const sharedHash = await hashPassword(SEED_PASSWORD) // outside the loop

    // 4. Upsert by username (idempotent) — suffix a username that collides with the
    //    bootstrap admin so the demo/bootstrap login is never clobbered.
    const username = resolveLegacyUsername(lu.PENGGUNA_USERNAME, lu.PENGGUNA_ID, reservedUsernames)
    await prisma.user.upsert({
      where: { username },
      create: {
        legacyId: lu.PENGGUNA_ID,
        roleId: role.id,
        name: lu.PENGGUNA_NAMA || 'Legacy User',
        username,
        passwordHash: sharedHash,
        mustChangePassword: true,  // CRITICAL: force reset
      },
      update: { legacyId: lu.PENGGUNA_ID, roleId: role.id, passwordHash: sharedHash, mustChangePassword: true },
    })
  }

  // 5. For a production cutover (override LEGACY_SEED_PASSWORD), DLH IT staff contact
  //    users with temporary credentials out-of-band. NO credentials in logs/code/email.
}
```

**Password hashing:** use Argon2id (via `argon2` npm package, OWASP recommendation). See [`06-auth-rbac.md`](./06-auth-rbac.md) for the complete password reset flow.

## 6. RBAC migration

### Algorithm: derive permissions from legacy menu/hakaksesmenu

Legacy model:
- `menu` table: menu URIs and action IDs.
- `hakaksesmenu` table: (role, menu) grants.
- Goal: map to new `Permission`/`RolePermission` model (see [`06-auth-rbac.md`](./06-auth-rbac.md)).

### Steps (implemented in `scripts/migration/lib/permission-map.ts`)

The legacy `menu` tree keys screens under section prefixes — `crud/<entity>` and
`masterdata/<entity>` (the same master entities under two menus), `transaksi/<…>`,
`analisadata/<…>`, and `home/<section>` — **not** the new app's `/master/...` routes, so a
naïve prefix map matches nothing. The real algorithm:

1. **Normalise** each `MENU_URI`: lowercase, then collapse `crud/` and `masterdata/` into one
   `master/<entity>` namespace.
2. **Longest-prefix match** the normalised URI against `PERMISSION_MAP` → permission keys
   (`derivePermissionKeys`). Unmapped menus contribute nothing (logged); every emitted key is
   guarded against the permission catalog by a unit test.
3. **Upsert** the catalog permissions, then for each legacy `hakaksesmenu` grant upsert a
   `RolePermission` for the mapped role × keys.

On the real `dkp_swat` snapshot: 188 legacy grants → **557 `RolePermission` rows** across 17
roles. `Administrator` is granted all permissions (bootstrap superuser); every other role carries
exactly its legacy-derived grants.

```typescript
async function migrateRBACGrants() {
  // 1. Enumerate unique menu actions from legacy system
  const legacyMenuGrants = await legacyQuery(`
    SELECT DISTINCT hm.HAKAKSES_ID, m.MENU_ID, m.MENU_TEKS, m.MENU_LINK
    FROM hakaksesmenu hm
    JOIN menu m ON hm.MENU_ID = m.MENU_ID
  `)
  
  // 2. Derive permission keys by longest-prefix match on the NORMALISED URI
  //    (crud/* and masterdata/* → master/*). Keyed on the real legacy menu URIs:
  const permissionMap = {
    'master/kendaraan': ['vehicle:read', 'vehicle:create', 'vehicle:update', 'vehicle:delete'],
    'master/spot': ['site:read', 'site:create', 'site:update', 'site:delete'],
    'transaksi/pemeriksaankendaraan': ['inspection:read', 'inspection:create', /* … */],
    'transaksi/pengambilansampah': ['trip:read', 'trip:record-pickup', 'trip:update'],
    'transaksi/pembuangansampah': ['trip:read', 'trip:record-disposal', 'trip:verify'],
    'transaksi/retribusi': ['levy:read', 'levy:create', 'levy:update', 'levy:delete'],
    'home/laporan': ['report:read', 'report:generate', 'report:export'],
    'analisadata': ['monitoring:read'], 'home/monitoring': ['monitoring:read'],
    // ... see lib/permission-map.ts for the full table
  }
  
  // 3. Create/fetch permissions
  const permissions = await Promise.all(
    Array.from(new Set(Object.values(permissionMap).flat())).map(key =>
      prisma.permission.upsert({
        where: { key },
        create: { key, description: `Legacy: ${key}` },
        update: {},
      })
    )
  )
  
  // 4. For each legacy grant, insert RolePermission
  const roleMap = new Map() // legacyId → new role
  for (const grant of legacyMenuGrants) {
    const role = await prisma.role.findFirst({
      where: { legacyId: grant.HAKAKSES_ID }
    })
    if (!role) continue
    
    const perms = derivePermissionKeys(grant.MENU_URI) // normalise + longest-prefix match
    for (const perm of perms) {
      const permission = permissions.find(p => p.key === perm)
      if (permission) {
        await prisma.rolePermission.createIfNotExists({
          roleId: role.id,
          permissionId: permission.id,
        })
      }
    }
  }
}
```

## 7. Identity & UUID v7 PKs with legacy ID bridge

### All PKs are UUID v7
Every table has a UUID v7 PK (`String @id @db.Uuid @default(uuid(7))`). Legacy numeric PKs are stored in `legacyId` (indexed, unique per table) for migration traceability and FK resolution:
```prisma
model Vehicle {
  id       String @id @db.Uuid @default(uuid(7))
  legacyId Int?   @unique  // Legacy numeric PK
  // ...
}
```

### Legacy FK resolution
During migration, the loader generates a map of `legacyId → new UUID` for each table, then resolves legacy FKs (e.g., a Trip's old `haulAssignmentId = 12345`) to new UUIDs by looking up the HaulAssignment with `legacyId = 12345` and copying its new `id`.

## 8. Validation & reporting

### Row-count reconciliation
After each phase, verify:
```typescript
async function reconcilePhase(phase: string, table: string, expectedCount: number) {
  const result = await legacyQuery(`SELECT COUNT(*) as cnt FROM ${table}`)
  const legacy = result[0].cnt
  
  const migratedCount = await prisma[model].count()
  
  const status = migratedCount === legacy ? '✓' : '✗ MISMATCH'
  console.log(`${phase} ${table}: legacy=${legacy} migrated=${migratedCount} ${status}`)
  
  return { table, legacy, migrated: migratedCount, status }
}
```

### FK integrity checks
```typescript
// Spot gaps: vehicle.poolSiteId must exist in site.id
const gaps = await prisma.$queryRaw`
  SELECT v.id, v.legacy_id, v.pool_site_id
  FROM vehicle v
  WHERE v.pool_site_id NOT IN (SELECT id FROM site)
`
if (gaps.length > 0) {
  console.error('FK violation: vehicles missing pool sites', gaps)
  throw new Error('FK integrity check failed')
}
```

### Migration report
```typescript
async function generateReport() {
  return {
    timestamp: new Date(),
    source: 'MySQL dkp_swat',
    target: 'PostgreSQL / Prisma',
    summary: {
      totalLegacyRows: 22000,
      migratedRows: 22000,
      skippedRows: 0,
      deduplicatedRoutes: 42,
    },
    phaseResults: [...], // per step 3 above
    dataQualityFixes: {
      zeroDatesBecomeNull: 847,
      bogusYearsNulled: 23,
      (0,0)GPS: 12,
      duplicateRoutes: 42,
    },
    securityActions: {
      md5PasswordsDropped: 67,
      usersSetToChangePasswordRequired: true,
      tempCredentialsGenerated: 67,
    },
    fkIntegrityChecksPassed: true,
  }
}
```

### Verification script
After migration, run a re-runnable check:
```bash
pnpm exec ts-node scripts/verify-migration.ts
```

It validates:
- No orphaned FKs.
- All `legacyId` values are unique (or NULL).
- Row counts match (within tolerance for dedup).
- No MD5 hashes in `passwordHash`.
- All users have `mustChangePassword=true`.
- All dates are valid `timestamptz` (no `0000-00-00`).

## 9. Rollback & repeatability

### Idempotency flag
The migration script detects existing `legacyId` values and refuses to re-run (error unless
`--force-reset` flag). This prevents accidental double-migration:
```typescript
async function checkIdempotency(forceReset: boolean) {
  const existing = await prisma.user.findFirst({ where: { legacyId: { not: null } } })
  if (existing && !forceReset) {
    throw new Error(
      'Migration already applied. Re-run with --force-reset to truncate & re-migrate.'
    )
  }
  if (forceReset) {
    console.warn('Force reset: truncating all tables')
    await prisma.$executeRaw`TRUNCATE TABLE ... CASCADE`
  }
}
```

### Rollback plan
In case of failure:
1. **Partial failure during load:** Prisma transaction rolls back (all-or-nothing per step).
2. **Post-load discovery of corruption:** restore PostgreSQL from backup (pre-migration snapshot).
3. **Manual fix:** edit the migration script, run `--force-reset` again.

## 10. Image migration (filesystem → object storage)

Legacy photos are files on the PHP server referenced by `varchar(1024)` path columns
(`PENGGUNA_FOTO`, `SPOT_FOTO`, `PENGEMUDI_FOTO`, `dokumentasitrayek`, `dokumentasikendaraan`, …).
Target = S3-compatible **object storage** with DB rows holding only object keys (see
[`12-scalability-archiving.md`](./12-scalability-archiving.md) §6).

**Process (`scripts/migrate-images.ts`, streamed + resumable with bounded concurrency, e.g. 5–10 parallel workers):**
1. Enumerate legacy path columns + the `dokumentasi*` tables → list of (ownerType, ownerId,
   legacyPath).
2. For each file: read from the legacy filesystem (or an exported archive), validate MIME/size,
   compute checksum, upload to the correct bucket (`swat-photos/<ownerType>/<ownerId>/<uuid>.<ext>`).
3. Generate a thumbnail (async) → `swat-thumbnails`.
4. Insert a `Photo` row (objectKey, contentType, sizeBytes, dimensions, checksum, ownerType/ownerId).
5. **Reconcile:** count files vs `Photo` rows; report **orphaned rows** (path with no file) and
   **orphaned files** (file with no DB owner); verify checksums on a sample.
6. **Idempotent:** keyed by checksum+ownerKey; re-run skips uploaded files. **Resumable** via a
   watermark file. Run in parallel workers (bounded concurrency) given the volume.
7. **Lifecycle:** apply bucket lifecycle rules (hot ≤13 months → cold) per doc 12.

**Acceptance:** 100% of referenced-and-existing files uploaded with matching checksums; orphan report
reviewed and signed off; no image bytes remain in PostgreSQL.

## 11. Application migration & cutover requirements

Moving from the **live** legacy PHP app to the new stack while operations continue daily.

### 11.1 Strategy
- **Phased delivery + parallel run** (not big-bang). Build per the
  [`11-development-plan/README.md`](./11-development-plan/README.md) phases; cut over module-by-module where
  feasible, with a final operational cutover for the daily transaction flow.
- **Strangler approach (optional):** during transition, the new app can be the system of record for
  migrated modules while read-only legacy access remains for reference, behind one login portal if
  practical. If a hard switch is required, use the parallel-run + freeze window below.

### 11.2 Parallel run & data sync
- **Discovery + initial bulk migration** (§0–§3, §10) run against a recent production copy in a
  staging environment; validate thoroughly.
- **Delta sync:** because the legacy system keeps running, capture changes since the bulk snapshot
  via a **second incremental pass** (by `legacyId`/date watermark) close to cutover, minimizing the
  freeze window.
- **Parallel-run validation:** for an agreed period, enter a sample of real daily data into **both**
  systems (or replay legacy entries into the new one) and reconcile tonnage/fuel/ritase totals to
  prove functional + numerical parity.

### 11.3 Cutover runbook (per operation)
1. Announce maintenance/freeze window (low-activity period; confirm with DLH ops).
2. Freeze writes on legacy (read-only).
3. Run final **delta sync**; run **verification script** (§8) + per-year reconciliation; run
   **image reconcile** (§10).
4. Sign-off checklist (data parity, auth works, smoke tests of each Phase-1 flow).
5. Flip DNS / reverse-proxy to the new app; distribute temporary credentials (forced reset, §5).
6. Keep legacy reachable **read-only** for a defined fallback window.

### 11.4 Rollback
- Defined **rollback trigger criteria** (e.g. data-integrity failure, auth outage, critical bug).
- Within the fallback window: re-point to legacy (still read-only-capable), or restore the new DB
  from the pre-cutover snapshot and re-run delta. Document the decision authority (DLH IT lead).

### 11.5 Training, comms & decommission
- **User training** before cutover: role-based guides (Indonesian), the changed daily flow, forced
  password reset; a quick-reference for the glossary (old term → new screen).
- **Support:** hypercare period with a fast feedback channel; known-issues log.
- **Decommission:** after the fallback window and sign-off, archive the legacy DB + image store
  (cold storage, retained per government policy) and shut down the PHP/Apache/XAMPP stack.

### 11.6 Acceptance criteria (cutover)
- All populated legacy tables reconciled (per-year row counts + FK integrity) with a signed report.
- All referenced images migrated + reconciled.
- No MD5 hashes; all users `mustChangePassword=true`.
- Each Phase-1 flow passes smoke + parallel-run parity (tonnage/fuel/ritase totals match legacy
  within agreed tolerance).
- Rollback plan tested in staging.
- DLH ops sign-off obtained.

---

## Summary table (reference)

| Legacy table | New model(s) | Rows (data dump) | Actions | Status |
|--------------|-------------|---|---------|--------|
| haritransaksi | TransactionDay | 4,413 structure only / **millions live** | migrate; batched load (§3.1) | ✓ |
| rute | Route | ~4,944 | migrate; **dedupe**; fix GPS | ✓ |
| sampahmasuktpa | TpaInboundLog | 11,171 | migrate; MyISAM→normal; batched streamed load (§3.1); partitioned monthly | ✓ |
| kendaraan | Vehicle | 1,463 | migrate; fix manufactureYear, currentOdometer | ✓ |
| kategorisumbersampahkendaraan | VehicleWasteSource | 1,466 | migrate | ✓ |
| masterdetailtransaksiangkutsampah | CrewSchedule | 1,411 | migrate | ✓ |
| mastertrayek | TripTemplate | 2,128 | migrate | ✓ |
| spot | Site | 934 | migrate; fix GPS | ✓ |
| pengemudi | Driver | 316 | migrate; fix dates | ✓ |
| pengguna | User | 67 | **do not copy hashes**; reset to random; mustChangePassword=true | ✓ |
| kategorikendaraan | VehicleModel | 251 | migrate | ✓ |
| tonase | DailyTonnage | 364 | migrate | ✓ |
| retribusi | Levy | 134 | migrate | ✓ |
| hakaksesmenu | RolePermission | 188 | derive permissions from menu URIs | ✓ |
| kepemilikansim | DriverLicense | 14 | migrate | ✓ |
| konversi_si_swat | LegacyNameMap | 31 | migrate; MyISAM→normal | ✓ |
| menu | (dropped) | 120 | replaced by Permission/RolePermission | — |
| hakakses | Role | 17 | migrate; map legacy role names | ✓ |
| jatahkitir | DisposalPermit | 0 in snapshot / **~3.3M high-water live** | batched streamed load (§3.1); partitioned yearly | ✓ |
| transaksiangkutsampah | Haul | 0 in snapshot / **millions live** | batched streamed load (§3.1); partitioned monthly | ✓ |
| detailtransaksiangkutsampah | HaulAssignment | 0 in snapshot / **millions live** | batched streamed load (§3.1); partitioned monthly | ✓ |
| trayek | Trip | 0 in snapshot / **tens of millions live** | batched streamed load (§3.1); partitioned monthly | ✓ |
| dokumentasi* | Photo (object storage) | 0 in snapshot / **millions live** | image migration (§10) → object storage | ✓ |
| riwayatperawatan / detailriwayatperawatan | MaintenanceRecord / MaintenanceItem | 0 in snapshot / live unknown | batched load (§3.1) if present | ✓ |

---

**Next:** See [`12-scalability-archiving.md`](./12-scalability-archiving.md) for partitioning,
archiving, caching, and object storage that the high-volume load targets;
[`05-architecture.md`](./05-architecture.md) for the monorepo setup; and
[`06-auth-rbac.md`](./06-auth-rbac.md) for the complete auth/permission model.
