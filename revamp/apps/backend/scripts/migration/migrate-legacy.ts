/**
 * T-152..T-158 — Legacy → PostgreSQL loader. Reads MySQL via mysql2, writes via
 * Prisma in FK-dependency order (specs/04-migration.md §3). Idempotent by
 * `legacyId`; `--force-reset` truncates and re-loads; the high-volume
 * transactional phase (`--include-transactions`) streams in keyset batches with a
 * resumable watermark.
 *
 * Run (operator, on-prem — needs legacy MySQL + a migrated/seeded PostgreSQL):
 *   LEGACY_DB_HOST=… DATABASE_URL=… pnpm --filter @swat/backend run migrate:legacy
 *
 * The pure transforms/mappers/enums are unit-tested (scripts/migration/lib/*.spec.ts);
 * the end-to-end run is the operator's step (Docker unavailable in dev).
 */
import { join } from 'node:path';

import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

import { PERMISSION_CATALOG } from '../../src/common/auth/permission-catalog';
import { loadScriptEnv } from '../../src/common/prisma/load-script-env';
import { pgAdapter } from '../../src/common/prisma/pg-adapter';

import { mapDayStatus, mapTripStatus } from './lib/enums';
import type {
  LegacyScheduleTemplate,
  LegacyDriver,
  LegacyDriverLicense,
  LegacyFuel,
  LegacyFuelCategory,
  LegacyDisposalPermit,
  LegacyHaul,
  LegacyHaulAssignment,
  LegacyLevy,
  LegacyLicenseClass,
  LegacyNameMapRow,
  LegacyRole,
  LegacyRoute,
  LegacySite,
  LegacyTpaInbound,
  LegacyTransactionDay,
  LegacyTrip,
  LegacyTripTemplate,
  LegacyUser,
  LegacyDailyTonnage,
  LegacyVehicle,
  LegacyVehicleType,
  LegacyVehicleModel,
  LegacyVehicleWasteSource,
  LegacyWasteSource,
} from './lib/legacy-types';
import {
  mapDailyTonnage,
  mapDriver,
  mapDriverLicense,
  mapFuel,
  mapFuelCategory,
  mapDisposalPermit,
  mapLevy,
  mapLicenseClass,
  mapNameMap,
  mapRoute,
  mapSite,
  mapVehicle,
  mapVehicleType,
  mapVehicleModel,
  mapVehicleWasteSource,
  mapWasteSource,
  resolveFk,
  toLegacyMap,
} from './lib/mappers';
import {
  distinctKeys,
  fetchExistingLegacyIds,
  keysetBatches,
  readWatermark,
  resolveParents,
  writeWatermark,
} from './lib/pagination';
import { derivePermissionKeys } from './lib/permission-map';
import { completeRoutes } from './lib/route-completion';
import {
  type Flags,
  connectLegacy,
  legacyDbConfigFromEnv,
  log,
  parseFlags,
  query,
  warn,
} from './lib/runtime';
import {
  capApprovedFuel,
  clampNonNegative,
  dedupeRoutes,
  fixDate,
  grossOrNullIfBelowTare,
  legacyTimeToDate,
  nonNegativeOrNull,
  parseDmyDate,
  resolveLegacyUsername,
  routeDedupeKey,
  trimOrNull,
} from './lib/transforms';

// Target-environment config. For staging/production the caller provides DATABASE_URL +
// LEGACY_DB_* in the process environment: `infra/seed-legacy-from-dump.sh` decrypts
// DATABASE_URL from the encrypted `infra/env/backend/.env.staging` (the SAME file the
// runtime uses — no separate seed env file) and sets LEGACY_DB_* for the throwaway MySQL.
// SEED_ENV is just a flag that says "trust the ambient env; do NOT loadScriptEnv()", whose
// prisma/.env (dev) DATABASE_URL would otherwise shadow the target. The local `seed:legacy`
// track leaves SEED_ENV unset and uses prisma/.env / .env.local.
const seedEnv = process.env.SEED_ENV;
if (seedEnv) {
  if (!process.env.DATABASE_URL || !process.env.LEGACY_DB_HOST) {
    throw new Error(
      `SEED_ENV=${seedEnv} requires DATABASE_URL + LEGACY_DB_* in the environment. ` +
        `Use infra/seed-legacy-from-dump.sh (it decrypts DATABASE_URL from ` +
        `infra/env/backend/.env.staging and stands up the legacy MySQL), or export them yourself.`,
    );
  }
} else {
  // Local `seed:legacy`: pull DATABASE_URL + LEGACY_DB_* from prisma/.env / .env.
  loadScriptEnv();
}

const prisma = new PrismaClient({ adapter: pgAdapter() });
const NOW = new Date();

/** Resumable keyset watermarks for every streamed table (shared across phases). */
const WATERMARK_PATH = join(__dirname, 'reports', 'watermark.json');

/**
 * Partition window pre-created by `20260608000100_partition_transactions`
 * (2013-01..2026-12 monthly + a DEFAULT catch-all). Rows whose `operationDate`
 * falls outside this land in `*_default` — harmless but bad for pruning, and a
 * signal that the partition migration must be extended before loading. The loader
 * warns rather than silently misroutes.
 */
const PARTITION_RANGE_START = Date.UTC(2013, 0, 1);
const PARTITION_RANGE_END = Date.UTC(2027, 0, 1);
let outOfRangeOperationDates = 0;

/** Count (and pass through) a denormalized operationDate that would miss the partition window. */
function checkPartitionRange(date: Date): Date {
  const t = date.getTime();
  if (t < PARTITION_RANGE_START || t >= PARTITION_RANGE_END) {
    outOfRangeOperationDates += 1;
  }
  return date;
}

/**
 * Dev/test password set on the bootstrap `admin` AND every migrated legacy user
 * (override with `LEGACY_SEED_PASSWORD`). Legacy users get it with a forced
 * first-login reset; the bootstrap admin is ready to use. Not a production
 * secret — the legacy track is for staging/test loads.
 */
const SEED_PASSWORD = process.env.LEGACY_SEED_PASSWORD ?? 'Password123!';

// `findMany` selection that feeds toLegacyMap (legacy id → new UUID).
const ID_LEGACY = { select: { id: true, legacyId: true } } as const;

/** Map a handful of well-known legacy role names → canonical seeded role names. */
const ROLE_NAME_MAP: Record<string, string> = {
  Administrator: 'Administrator',
  Admin: 'Administrator',
  'Administrasi Data': 'Administrasi Data',
  Checker: 'Checker',
  'Operator Pool': 'Operator Pool',
  'Petugas TPA': 'Petugas TPA',
  Supervisor: 'Supervisor',
};

async function checkIdempotency(forceReset: boolean, includeTransactions: boolean): Promise<void> {
  const existing = await prisma.user.findFirst({ where: { legacyId: { not: null } } });
  if (existing && !forceReset) {
    // Already applied. Every write is skipDuplicates/upsert, so a re-run just adds
    // what's missing (e.g. levy after the mapper landed) and refreshes nothing it
    // shouldn't — additive, no duplicates. Use --force-reset for a clean reload.
    warn('Migration already applied — re-running idempotently (skipDuplicates). No truncate.');
  }
  if (forceReset) {
    warn('Force reset: truncating migrated tables (CASCADE).');
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "disposal_permit","trip_template","schedule_template","driver_license","driver",
       "vehicle_waste_source","vehicle","vehicle_model","waste_source","route","site","fuel",
       "fuel_category","vehicle_type","license_class","daily_tonnage","levy","legacy_name_map"
       CASCADE`,
    );
    // disposal_permit is in the master set above and streamed (watermarked) in
    // migrateScheduling — reset its watermark whenever we force-reset.
    writeWatermark(WATERMARK_PATH, 'disposal_permit', 0);
    if (includeTransactions) {
      // The partitioned transaction tables aren't in the CASCADE set above (they have
      // no FK from the master tables). Clear them too for a clean transactional reload,
      // and reset their keyset watermarks so the stream restarts from the top.
      warn('Force reset: truncating transaction tables + resetting watermarks.');
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "trip","haul_assignment","haul","transaction_day","tpa_inbound_log"
         RESTART IDENTITY CASCADE`,
      );
      for (const key of ['transaction_day', 'haul', 'haul_assignment', 'trip', 'tpa_inbound_log']) {
        writeWatermark(WATERMARK_PATH, key, 0);
      }
    }
  }
}

/**
 * Make the legacy track self-sufficient: ensure the permission catalog, a
 * full-access `Administrator` role, and the bootstrap `admin` user all exist —
 * so `seed:legacy` needs no prior `seed:auth` (no demo data). Returns the admin
 * id used for `createdById` attribution on migrated rows. Idempotent.
 */
async function ensureAuthBootstrap(): Promise<string> {
  // 1. Permission catalog (the app reconciles these at boot too; upsert here so a
  //    standalone legacy load still has grant targets).
  for (const { key, description } of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
  const permIds = (await prisma.permission.findMany({ select: { id: true } })).map((p) => p.id);

  // 2. Administrator = the full-access bootstrap role (its concrete grants are a
  //    superset of whatever the legacy "Administrator" menu maps to). Other roles
  //    stay pure-legacy.
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: { name: 'Administrator' },
  });
  await prisma.rolePermission.createMany({
    data: permIds.map((permissionId) => ({ roleId: adminRole.id, permissionId })),
    skipDuplicates: true,
  });

  // 3. Bootstrap admin — ready to use (no forced reset). Re-seedable: restores the
  //    credential + role even if a prior run changed them.
  const passwordHash = await hash(SEED_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, mustChangePassword: false, roleId: adminRole.id },
    create: {
      username: 'admin',
      name: 'Administrator',
      passwordHash,
      roleId: adminRole.id,
      mustChangePassword: false,
    },
  });
  log(`Auth bootstrap: ${permIds.length} permissions, Administrator role, admin user ready.`);
  return admin.id;
}

async function migrateMasterData(): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    // Each table is loaded, then its `legacyId → new UUID` map is read back so the
    // next table's FK mapper can resolve references (PKs are generated UUID v7,
    // never the legacy integer). Order respects FK dependencies.
    const apps = await query<LegacyVehicleType>(conn, 'SELECT * FROM aplikasikendaraan');
    await prisma.vehicleType.createMany({
      data: apps.map((r) => mapVehicleType(r, NOW)),
      skipDuplicates: true,
    });
    const appMap = toLegacyMap(await prisma.vehicleType.findMany(ID_LEGACY));
    log(`VehicleType: ${apps.length}`);

    const fuelCats = await query<LegacyFuelCategory>(conn, 'SELECT * FROM kategoribahanbakar');
    await prisma.fuelCategory.createMany({
      data: fuelCats.map((r) => mapFuelCategory(r, NOW)),
      skipDuplicates: true,
    });
    const fuelCatMap = toLegacyMap(await prisma.fuelCategory.findMany(ID_LEGACY));

    const fuels = await query<LegacyFuel>(conn, 'SELECT * FROM bahanbakar');
    await prisma.fuel.createMany({
      data: fuels.map((r) => mapFuel(r, NOW, fuelCatMap)),
      skipDuplicates: true,
    });
    const fuelMap = toLegacyMap(await prisma.fuel.findMany(ID_LEGACY));

    const licenseClasses = await query<LegacyLicenseClass>(conn, 'SELECT * FROM sim');
    await prisma.licenseClass.createMany({
      data: licenseClasses.map((r) => mapLicenseClass(r, NOW)),
      skipDuplicates: true,
    });
    const licenseClassMap = toLegacyMap(await prisma.licenseClass.findMany(ID_LEGACY));

    const sites = await query<LegacySite>(conn, 'SELECT * FROM spot');
    await prisma.site.createMany({ data: sites.map((r) => mapSite(r, NOW)), skipDuplicates: true });
    const siteMap = toLegacyMap(await prisma.site.findMany(ID_LEGACY));
    log(`Site: ${sites.length}`);

    // Routes — dedupe on (origin, destination, category). ORDER BY RUTE_ID makes
    // "first occurrence wins" deterministic AND identical to the remap built in
    // migrateScheduling (same ordered query), so no TripTemplate can point at a
    // dropped duplicate.
    const routes = await query<LegacyRoute>(conn, 'SELECT * FROM rute ORDER BY RUTE_ID');
    const { kept, dropped } = dedupeRoutes(routes, (r) =>
      routeDedupeKey(r.SPOT_ASAL_ID, r.SPOT_TUJUAN_ID, r.KATEGORIRUTE_ID),
    );
    await prisma.route.createMany({
      data: kept.map((r) => mapRoute(r, NOW, siteMap)),
      skipDuplicates: true,
    });
    log(`Route: ${kept.length} kept, ${dropped.length} duplicates dropped`);

    const wasteSources = await query<LegacyWasteSource>(conn, 'SELECT * FROM kategorisumbersampah');
    await prisma.wasteSource.createMany({
      data: wasteSources.map((r) => mapWasteSource(r, NOW)),
      skipDuplicates: true,
    });
    const wasteSourceMap = toLegacyMap(await prisma.wasteSource.findMany(ID_LEGACY));

    const models = await query<LegacyVehicleModel>(conn, 'SELECT * FROM kategorikendaraan');
    await prisma.vehicleModel.createMany({
      data: models.map((r) => mapVehicleModel(r, NOW, appMap, fuelMap)),
      skipDuplicates: true,
    });
    const modelMap = toLegacyMap(await prisma.vehicleModel.findMany(ID_LEGACY));

    const vehicles = await query<LegacyVehicle>(conn, 'SELECT * FROM kendaraan');
    // SWAT enforces a unique plate, but 13y of legacy data has blank/placeholder
    // ("Excavator") and genuinely duplicate plates. Disambiguate those by suffixing
    // the legacy id (`B9552EQ#1048`, blank → `NOPOL#<id>`) and flag them
    // `needsPlateReview` so EVERY vehicle survives + stays FK-resolvable — a plain
    // `skipDuplicates` would instead drop them and orphan their hauls/permits.
    const plateCount = new Map<string, number>();
    for (const v of vehicles) {
      const plate = (v.KENDARAAN_NOMORPOLISI ?? '').trim();
      plateCount.set(plate, (plateCount.get(plate) ?? 0) + 1);
    }
    let plateReviewCount = 0;
    const vehicleData = vehicles.map((v) => {
      const mapped = mapVehicle(v, NOW, siteMap, modelMap);
      const plate = (v.KENDARAAN_NOMORPOLISI ?? '').trim();
      if (plate === '' || (plateCount.get(plate) ?? 0) > 1) {
        plateReviewCount += 1;
        return {
          ...mapped,
          plateNumber: `${plate || 'NOPOL'}#${v.KENDARAAN_ID}`,
          needsPlateReview: true,
        };
      }
      return mapped;
    });
    await prisma.vehicle.createMany({ data: vehicleData, skipDuplicates: true });
    const vehicleMap = toLegacyMap(await prisma.vehicle.findMany(ID_LEGACY));
    log(`Vehicle: ${vehicles.length}`);
    if (plateReviewCount > 0) {
      warn(
        `Vehicle: disambiguated ${plateReviewCount} blank/duplicate plate(s) with a #legacyId suffix (needsPlateReview=true) — reconcile in-app before they appear at the weighbridge.`,
      );
    }

    const vws = await query<LegacyVehicleWasteSource>(
      conn,
      'SELECT * FROM kategorisumbersampahkendaraan',
    );
    // Soft many-to-many junction: tolerate a row whose vehicle/source could not be
    // migrated (e.g. a vehicle dropped on the unique-plate constraint) by skipping
    // it with a counted warning — never silently. A missing source link is
    // recoverable; a crash here would abort the whole master load.
    const vwsResolvable = vws.filter(
      (r) => vehicleMap.has(r.KENDARAAN_ID) && wasteSourceMap.has(r.KATEGORISUMBERSAMPAH_ID),
    );
    await prisma.vehicleWasteSource.createMany({
      data: vwsResolvable.map((r) => mapVehicleWasteSource(r, vehicleMap, wasteSourceMap)),
      skipDuplicates: true,
    });
    const vwsSkipped = vws.length - vwsResolvable.length;
    if (vwsSkipped > 0) {
      warn(
        `VehicleWasteSource: skipped ${vwsSkipped}/${vws.length} link(s) referencing an unmigrated vehicle/source (likely a duplicate-plate vehicle dropped on the unique constraint — see verify-migration count reconciliation).`,
      );
    }

    const drivers = await query<LegacyDriver>(conn, 'SELECT * FROM pengemudi');
    await prisma.driver.createMany({
      data: drivers.map((r) => mapDriver(r, NOW, siteMap)),
      skipDuplicates: true,
    });
    const driverMap = toLegacyMap(await prisma.driver.findMany(ID_LEGACY));
    log(`Driver: ${drivers.length}`);

    const licenses = await query<LegacyDriverLicense>(conn, 'SELECT * FROM kepemilikansim');
    await prisma.driverLicense.createMany({
      data: licenses.map((r) => mapDriverLicense(r, NOW, driverMap, licenseClassMap)),
      skipDuplicates: true,
    });
  } finally {
    await conn.end();
  }
}

async function migrateAuth(): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    // Roles — tag the seeded canonical roles with their legacyId; create any extras.
    const legacyRoles = await query<LegacyRole>(conn, 'SELECT * FROM hakakses');
    for (const lr of legacyRoles) {
      const canonical = ROLE_NAME_MAP[lr.HAKAKSES_NAMA] ?? lr.HAKAKSES_NAMA;
      const existing = await prisma.role.findFirst({ where: { name: canonical } });
      if (existing) {
        await prisma.role.update({
          where: { id: existing.id },
          data: { legacyId: lr.HAKAKSES_ID },
        });
      } else {
        await prisma.role.create({ data: { name: canonical, legacyId: lr.HAKAKSES_ID } });
      }
    }
    log(`Role: ${legacyRoles.length} mapped`);

    // RBAC grants — derive permission keys from legacy menu URIs.
    const grants = await query<{ HAKAKSES_ID: number; MENU_URI: string }>(
      conn,
      `SELECT hm.HAKAKSES_ID, m.MENU_URI FROM hakaksesmenu hm JOIN menu m ON hm.MENU_ID = m.MENU_ID`,
    );
    const permByKey = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));
    const roleByLegacy = new Map(
      (await prisma.role.findMany({ where: { legacyId: { not: null } } })).map((r) => [
        r.legacyId,
        r.id,
      ]),
    );
    let grantCount = 0;
    for (const g of grants) {
      const roleId = roleByLegacy.get(g.HAKAKSES_ID);
      if (!roleId) {
        continue;
      }
      for (const key of derivePermissionKeys(g.MENU_URI)) {
        const permissionId = permByKey.get(key);
        if (!permissionId) {
          continue;
        }
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          create: { roleId, permissionId },
          update: {},
        });
        grantCount += 1;
      }
    }
    log(`RolePermission grants applied: ${grantCount}`);

    // Users — NEVER migrate MD5; random unusable hash + forced reset. Demo/seed
    // accounts (no legacyId — `admin`, `adminreset`, the per-role demo logins) are
    // protected: a legacy user that shares one of those usernames is loaded under a
    // suffixed name so the demo login is never clobbered (see resolveLegacyUsername).
    const reserved = new Set(
      (await prisma.user.findMany({ where: { legacyId: null }, select: { username: true } })).map(
        (u) => u.username,
      ),
    );
    const users = await query<LegacyUser>(conn, 'SELECT * FROM pengguna');
    // Legacy passwords (MD5) are NEVER copied. Every migrated user gets the shared
    // SEED_PASSWORD with a forced first-login reset, so they can sign in to test
    // their mapped RBAC and are made to set a real password. Hash once (argon2 is
    // costly) and reuse.
    const sharedHash = await hash(SEED_PASSWORD);
    let migrated = 0;
    let preserved = 0;
    for (const lu of users) {
      const roleId = roleByLegacy.get(lu.HAKAKSES_ID);
      if (!roleId) {
        warn(`No role for legacy user ${lu.PENGGUNA_ID}; skipping.`);
        continue;
      }
      const username = resolveLegacyUsername(lu.PENGGUNA_USERNAME ?? '', lu.PENGGUNA_ID, reserved);
      if (username !== (lu.PENGGUNA_USERNAME?.trim() || `legacy_${lu.PENGGUNA_ID}`)) {
        preserved += 1;
      }
      await prisma.user.upsert({
        where: { username },
        create: {
          legacyId: lu.PENGGUNA_ID,
          roleId,
          name: lu.PENGGUNA_NAMA || 'Legacy User',
          username,
          passwordHash: sharedHash,
          mustChangePassword: true,
        },
        update: { legacyId: lu.PENGGUNA_ID, roleId, passwordHash: sharedHash, mustChangePassword: true }, // prettier-ignore
      });
      migrated += 1;
    }
    log(
      `User: ${migrated} migrated (password=SEED_PASSWORD, forced reset; no MD5 copied)` +
        (preserved ? `; ${preserved} suffixed to protect the bootstrap admin login` : ''),
    );
  } finally {
    await conn.end();
  }
}

async function migrateScheduling(sysUser: string, flags: Flags): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    // Resolve FKs against the master data loaded earlier (legacy id → new UUID).
    const vehicleMap = toLegacyMap(await prisma.vehicle.findMany(ID_LEGACY));
    const driverMap = toLegacyMap(await prisma.driver.findMany(ID_LEGACY));
    const siteMap = toLegacyMap(await prisma.site.findMany(ID_LEGACY));
    const routeMap = toLegacyMap(await prisma.route.findMany(ID_LEGACY));

    const schedules = await query<LegacyScheduleTemplate>(
      conn,
      'SELECT * FROM masterdetailtransaksiangkutsampah',
    );
    // SWAT models a crew pairing as unique `(vehicleId, driverId)`, but legacy
    // `masterdetailtransaksiangkutsampah` records the same pair more than once.
    // Dedupe on the pair (keep first occurrence) and remap dropped schedules to
    // the kept one so trip templates still resolve — mirrors the route dedupe.
    const crewKeptByPair = new Map<string, number>();
    const scheduleRemap = new Map<number, number>();
    let crewDropped = 0;
    for (const s of schedules) {
      const pair = `${s.KENDARAAN_ID}:${s.PENGEMUDI_ID}`;
      const keptLegacyId = crewKeptByPair.get(pair);
      if (keptLegacyId === undefined) {
        crewKeptByPair.set(pair, s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID);
        scheduleRemap.set(
          s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,
          s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,
        );
        await prisma.scheduleTemplate.upsert({
          where: { legacyId: s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID },
          create: {
            legacyId: s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,
            vehicleId: resolveFk(vehicleMap, s.KENDARAAN_ID, 'scheduleTemplate.vehicleId'),
            driverId: resolveFk(driverMap, s.PENGEMUDI_ID, 'scheduleTemplate.driverId'),
            departTime:
              legacyTimeToDate(s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG) ?? NOW,
            returnTime:
              legacyTimeToDate(s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG) ?? NOW,
          },
          update: {},
        });
      } else {
        scheduleRemap.set(s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID, keptLegacyId);
        crewDropped += 1;
      }
    }
    log(
      `ScheduleTemplate: ${crewKeptByPair.size} kept, ${crewDropped} duplicate vehicle+driver dropped`,
    );

    // Build the route-dedupe remap so templates point at the kept route id. Same
    // ORDER BY RUTE_ID as migrateMasterData so "kept" is identical in both passes.
    const routes = await query<LegacyRoute>(conn, 'SELECT * FROM rute ORDER BY RUTE_ID');
    const keptByKey = new Map<string, number>();
    const routeRemap = new Map<number, number>();
    for (const r of routes) {
      const key = routeDedupeKey(r.SPOT_ASAL_ID, r.SPOT_TUJUAN_ID, r.KATEGORIRUTE_ID);
      if (!keptByKey.has(key)) {
        keptByKey.set(key, r.RUTE_ID);
      }
      routeRemap.set(r.RUTE_ID, keptByKey.get(key) as number);
    }

    const scheduleByLegacy = new Map(
      (await prisma.scheduleTemplate.findMany({ where: { legacyId: { not: null } } })).map((s) => [
        s.legacyId,
        s.id,
      ]),
    );
    // Route detail (category + endpoints) to snapshot onto each trip template.
    const routeDetail = new Map(
      (
        await prisma.route.findMany({
          select: { id: true, category: true, originSiteId: true, destinationSiteId: true },
        })
      ).map((r) => [r.id, r]),
    );
    const templates = await query<LegacyTripTemplate>(conn, 'SELECT * FROM mastertrayek');
    let tplCount = 0;
    for (const t of templates) {
      const keptScheduleLegacyId =
        scheduleRemap.get(t.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID) ??
        t.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID;
      const scheduleTemplateId = scheduleByLegacy.get(keptScheduleLegacyId);
      if (!scheduleTemplateId) {
        continue;
      }
      const keptRouteLegacyId = routeRemap.get(t.RUTE_ID) ?? t.RUTE_ID;
      const routeId = resolveFk(routeMap, keptRouteLegacyId, 'tripTemplate.routeId');
      const detail = routeDetail.get(routeId);
      if (!detail) {
        continue;
      }
      await prisma.tripTemplate.upsert({
        where: { legacyId: t.MASTERTRAYEK_ID },
        create: {
          legacyId: t.MASTERTRAYEK_ID,
          scheduleTemplateId,
          routeId,
          routeCategory: detail.category,
          originSiteId: detail.originSiteId,
          destinationSiteId: detail.destinationSiteId,
          targetTime: legacyTimeToDate(t.MASTERTRAYEK_WAKTUTARGET) ?? NOW,
          fuelRequestedLiters: nonNegativeOrNull(t.MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN),
        },
        update: {},
      });
      tplCount += 1;
    }
    log(`TripTemplate: ${tplCount}`);

    // jatahkitir → DisposalPermit. ~2.4M rows, so stream in keyset batches rather
    // than `SELECT *` the whole table. legacyId IS @unique here, so createMany
    // skipDuplicates makes a re-run idempotent (no per-batch existence probe needed).
    let permitCount = 0;
    // Window permits by issue date too under --since-year (bounds a constrained target).
    const permitWindow = flags.sinceYear
      ? `AND JATAHKITIR_WAKTUDITERBITKAN >= '${flags.sinceYear}-01-01'`
      : '';
    const permitStart = flags.resume ? readWatermark(WATERMARK_PATH, 'disposal_permit') : 0;
    for await (const { rows, lastId } of keysetBatches<LegacyDisposalPermit>(
      (afterId, limit) =>
        query(
          conn,
          `SELECT * FROM jatahkitir WHERE JATAHKITIR_ID > ? ${permitWindow} ORDER BY JATAHKITIR_ID LIMIT ?`,
          [afterId, limit],
        ),
      (r) => r.JATAHKITIR_ID,
      flags.batchSize,
      permitStart,
    )) {
      // mapDisposalPermit resolves vehicle+site via the preloaded master maps and
      // throws on an unresolvable hard FK — fail loud (the loader never writes a
      // silent bad row), same as the original whole-table map.
      const data = rows.map((r) => mapDisposalPermit(r, NOW, sysUser, vehicleMap, siteMap));
      await prisma.disposalPermit.createMany({ data, skipDuplicates: true });
      permitCount += data.length;
      writeWatermark(WATERMARK_PATH, 'disposal_permit', lastId);
    }
    log(`DisposalPermit: ${permitCount}`);
  } finally {
    await conn.end();
  }
}

async function migrateAggregates(sysUser: string): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    const tonnage = await query<LegacyDailyTonnage>(conn, 'SELECT * FROM tonase');
    await prisma.dailyTonnage.createMany({
      data: tonnage.map((r) => mapDailyTonnage(r, NOW)),
      skipDuplicates: true,
    });

    const levies = await query<LegacyLevy>(conn, 'SELECT * FROM retribusi');
    await prisma.levy.createMany({
      data: levies.map((r) => mapLevy(r, NOW, sysUser)),
      skipDuplicates: true,
    });

    const nameMap = await query<LegacyNameMapRow>(conn, 'SELECT * FROM konversi_si_swat');
    // LegacyNameMap has no legacyId/unique key, so skipDuplicates can't dedupe it — a
    // re-run (e.g. --resume, which skips --force-reset's truncate) would otherwise
    // re-insert all rows. It's a tiny fully-derived table, so reset it for idempotency.
    await prisma.legacyNameMap.deleteMany();
    await prisma.legacyNameMap.createMany({
      data: nameMap.map((r) => mapNameMap(r, NOW)),
      skipDuplicates: true,
    });
    log(`Aggregates: tonnage=${tonnage.length} levy=${levies.length} nameMap=${nameMap.length}`);
  } finally {
    await conn.end();
  }
}

/**
 * T-155 — transactional history (the `--include-transactions` phase, staging +
 * production only). Loads, in FK order:
 *   haritransaksi               → TransactionDay
 *   transaksiangkutsampah       → Haul
 *   detailtransaksiangkutsampah → HaulAssignment
 *   trayek                      → Trip
 *   sampahmasuktpa              → TpaInboundLog (partitioned; raw insert)
 * The high-volume tables (TransactionDay, TpaInboundLog) stream in keyset batches
 * with a resumable watermark. Idempotent: rows already present (by legacyId) are
 * skipped, so a re-run or `--resume` never duplicates.
 */
async function migrateTransactions(sysUser: string, flags: Flags): Promise<void> {
  const watermarkPath = WATERMARK_PATH;
  // Optional date window (--since-year): only TransactionDays from this year load,
  // and Haul/HaulAssignment/Trip cascade-skip out-of-window rows (their day/parent
  // isn't present). sinceYear is a validated integer → safe to inline. Date compare
  // (>= 'YYYY-01-01') is index-friendlier than YEAR().
  const dayWindow = flags.sinceYear
    ? `AND HARITRANSAKSI_TANGGAL >= '${flags.sinceYear}-01-01'`
    : '';
  if (flags.sinceYear) {
    log(`Date window active: loading transactions from ${flags.sinceYear}-01-01 onward.`);
  }
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    // 1. haritransaksi → TransactionDay (keyset-batched, idempotent on legacyId/date).
    let dayCount = 0;
    const dayStart = flags.resume ? readWatermark(watermarkPath, 'transaction_day') : 0;
    for await (const { rows, lastId } of keysetBatches<LegacyTransactionDay>(
      (afterId, limit) =>
        query(
          conn,
          `SELECT * FROM haritransaksi WHERE HARITRANSAKSI_ID > ? ${dayWindow} ORDER BY HARITRANSAKSI_ID LIMIT ?`,
          [afterId, limit],
        ),
      (r) => r.HARITRANSAKSI_ID,
      flags.batchSize,
      dayStart,
    )) {
      const data = rows.flatMap((r) => {
        const date = fixDate(r.HARITRANSAKSI_TANGGAL);
        if (!date) return [];
        return [
          {
            legacyId: r.HARITRANSAKSI_ID,
            date,
            status: mapDayStatus(r.STATUSHARITRANSAKSI_ID),
          },
        ];
      });
      await prisma.transactionDay.createMany({ data, skipDuplicates: true });
      dayCount += data.length;
      writeWatermark(watermarkPath, 'transaction_day', lastId);
    }
    log(`TransactionDay: ${dayCount}`);

    // Small master maps preloaded once (each <5k rows) and reused across batches.
    const vehicleMap = toLegacyMap(await prisma.vehicle.findMany(ID_LEGACY));
    const driverMap = toLegacyMap(await prisma.driver.findMany(ID_LEGACY));
    const routeMap = toLegacyMap(await prisma.route.findMany(ID_LEGACY));
    const scheduleByLegacy = new Map(
      (
        await prisma.scheduleTemplate.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true },
        })
      ).map((s) => [s.legacyId, s.id]),
    );

    // 2. transaksiangkutsampah → Haul (~4.1M). Keyset-batched; per batch resolve only
    //    the distinct TransactionDay parents it references (never the whole table).
    //    Idempotent via the unique (operationDate, transactionDayId, vehicleId).
    let haulCount = 0;
    const haulStart = flags.resume ? readWatermark(watermarkPath, 'haul') : 0;
    for await (const { rows, lastId } of keysetBatches<LegacyHaul>(
      (afterId, limit) =>
        query(
          conn,
          'SELECT * FROM transaksiangkutsampah WHERE TRANSAKSIANGKUTSAMPAH_ID > ? ORDER BY TRANSAKSIANGKUTSAMPAH_ID LIMIT ?',
          [afterId, limit],
        ),
      (r) => r.TRANSAKSIANGKUTSAMPAH_ID,
      flags.batchSize,
      haulStart,
    )) {
      const dayByLegacy = await resolveParents(
        distinctKeys(rows, (r) => r.HARITRANSAKSI_ID),
        (ids) =>
          prisma.transactionDay.findMany({
            where: { legacyId: { in: ids } },
            select: { id: true, legacyId: true, date: true },
          }),
      );
      const data = rows.flatMap((r) => {
        const day = dayByLegacy.get(r.HARITRANSAKSI_ID);
        const vehicleId = vehicleMap.get(r.KENDARAAN_ID);
        if (!day || !vehicleId) return [];
        return [
          {
            legacyId: r.TRANSAKSIANGKUTSAMPAH_ID,
            transactionDayId: day.id,
            vehicleId,
            operationDate: checkPartitionRange(day.date),
            status: mapDayStatus(r.STATUSTRANSAKSIANGKUTSAMPAH_ID),
            notes: trimOrNull(r.TRANSAKSIANGKUTSAMPAH_KETERANGAN),
          },
        ];
      });
      await prisma.haul.createMany({ data, skipDuplicates: true });
      haulCount += data.length;
      writeWatermark(watermarkPath, 'haul', lastId);
    }
    log(`Haul: ${haulCount}`);

    // 3. detailtransaksiangkutsampah → HaulAssignment (~4.4M). Per batch resolve the
    //    Haul parents; HaulAssignment.legacyId is NOT unique (partitioned), so dedupe
    //    via a per-batch existing-legacyId probe rather than createMany skipDuplicates.
    let assignmentCount = 0;
    const assignmentStart = flags.resume ? readWatermark(watermarkPath, 'haul_assignment') : 0;
    for await (const { rows, lastId } of keysetBatches<LegacyHaulAssignment>(
      (afterId, limit) =>
        query(
          conn,
          'SELECT * FROM detailtransaksiangkutsampah WHERE DETAILTRANSAKSIANGKUTSAMPAH_ID > ? ORDER BY DETAILTRANSAKSIANGKUTSAMPAH_ID LIMIT ?',
          [afterId, limit],
        ),
      (r) => r.DETAILTRANSAKSIANGKUTSAMPAH_ID,
      flags.batchSize,
      assignmentStart,
    )) {
      const haulByLegacy = await resolveParents(
        distinctKeys(rows, (r) => r.TRANSAKSIANGKUTSAMPAH_ID),
        (ids) =>
          prisma.haul.findMany({
            where: { legacyId: { in: ids.map((n) => BigInt(n)) } },
            select: { id: true, legacyId: true, operationDate: true },
          }),
      );
      const already = await fetchExistingLegacyIds(
        rows.map((r) => r.DETAILTRANSAKSIANGKUTSAMPAH_ID),
        (ids) =>
          prisma.haulAssignment.findMany({
            where: { legacyId: { in: ids.map((n) => BigInt(n)) } },
            select: { legacyId: true },
          }),
      );
      const data = rows.flatMap((r) => {
        if (already.has(r.DETAILTRANSAKSIANGKUTSAMPAH_ID)) return [];
        const haul = haulByLegacy.get(r.TRANSAKSIANGKUTSAMPAH_ID);
        const driverId = driverMap.get(r.PENGEMUDI_ID);
        if (!haul || !driverId) return [];
        const scheduleTemplateId =
          r.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID != null
            ? (scheduleByLegacy.get(r.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID) ?? null)
            : null;
        return [
          {
            legacyId: r.DETAILTRANSAKSIANGKUTSAMPAH_ID,
            haulId: haul.id,
            driverId,
            scheduleTemplateId,
            operationDate: haul.operationDate,
            status: mapDayStatus(r.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID),
            departTargetOdometer: clampNonNegative(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG,
            ),
            departActualOdometer: nonNegativeOrNull(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG,
            ),
            returnTargetOdometer: clampNonNegative(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG,
            ),
            returnActualOdometer: nonNegativeOrNull(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG,
            ),
            departTargetTime: fixDate(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG,
            ),
            departActualTime: fixDate(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG,
            ),
            returnTargetTime: fixDate(r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG),
            returnActualTime: fixDate(
              r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG,
            ),
            notes: trimOrNull(r.DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN),
            createdById: sysUser,
          },
        ];
      });
      await prisma.haulAssignment.createMany({ data, skipDuplicates: true });
      assignmentCount += data.length;
      writeWatermark(watermarkPath, 'haul_assignment', lastId);
    }
    log(`HaulAssignment: ${assignmentCount}`);

    // 4. trayek → Trip (~8M). Per batch resolve the HaulAssignment parents; Trip.legacyId
    //    is NOT unique (partitioned), so dedupe via a per-batch existing-legacyId probe.
    let tripCount = 0;
    const tripStart = flags.resume ? readWatermark(watermarkPath, 'trip') : 0;
    for await (const { rows, lastId } of keysetBatches<LegacyTrip>(
      (afterId, limit) =>
        query(conn, 'SELECT * FROM trayek WHERE TRAYEK_ID > ? ORDER BY TRAYEK_ID LIMIT ?', [
          afterId,
          limit,
        ]),
      (r) => r.TRAYEK_ID,
      flags.batchSize,
      tripStart,
    )) {
      const assignmentByLegacy = await resolveParents(
        distinctKeys(rows, (r) => r.DETAILTRANSAKSIANGKUTSAMPAH_ID),
        (ids) =>
          prisma.haulAssignment.findMany({
            where: { legacyId: { in: ids.map((n) => BigInt(n)) } },
            select: { id: true, legacyId: true, operationDate: true },
          }),
      );
      const already = await fetchExistingLegacyIds(
        rows.map((r) => r.TRAYEK_ID),
        (ids) =>
          prisma.trip.findMany({
            where: { legacyId: { in: ids.map((n) => BigInt(n)) } },
            select: { legacyId: true },
          }),
      );
      const data = rows.flatMap((r) => {
        if (already.has(r.TRAYEK_ID)) return [];
        const assignment = assignmentByLegacy.get(r.DETAILTRANSAKSIANGKUTSAMPAH_ID);
        if (!assignment) return [];
        const routeId = r.RUTE_ID != null ? (routeMap.get(r.RUTE_ID) ?? null) : null;
        const fuelRequestedLiters = nonNegativeOrNull(r.TRAYEK_JUMLAHISIBBMDIAJUKAN);
        const tareWeight = clampNonNegative(r.TRAYEK_BERATKOSONGKENDARAAN);
        return [
          {
            legacyId: r.TRAYEK_ID,
            haulAssignmentId: assignment.id,
            routeId,
            operationDate: assignment.operationDate,
            status: mapTripStatus(r.STATUSTRAYEK_ID),
            name: trimOrNull(r.TRAYEK_NAMA) ?? 'Trayek',
            targetTime: fixDate(r.TRAYEK_WAKTUTARGET),
            actualTime: fixDate(r.TRAYEK_WAKTUREALISASI),
            targetOdometer: clampNonNegative(r.TRAYEK_KMTARGET),
            actualOdometer: clampNonNegative(r.TRAYEK_KMREALISASI),
            tareWeight,
            // gross ≥ tare (DB CHECK); legacy has ~1k faulty readings below tare.
            grossWeight: grossOrNullIfBelowTare(
              tareWeight,
              nonNegativeOrNull(r.TRAYEK_BERATKOTORTIMBANGAN),
            ),
            netWeight: nonNegativeOrNull(r.TRAYEK_BERATBERSIHSAMPAH),
            wasteVolume: nonNegativeOrNull(r.TRAYEK_VOLUMESAMPAH),
            fuelRequestedLiters,
            // approved ≤ requested (DB CHECK); legacy has ~100k violating rows.
            fuelApprovedLiters: capApprovedFuel(
              fuelRequestedLiters,
              nonNegativeOrNull(r.TRAYEK_JUMLAHISIBBMDISETUJUI),
            ),
            scheduledEntryAt: fixDate(r.TRAYEK_WAKTUENTRIPENJADWALAN),
            realizationEntryAt: fixDate(r.TRAYEK_WAKTUENTRIREALISASI),
            notes: trimOrNull(r.TRAYEK_KETERANGAN),
            createdById: sysUser,
          },
        ];
      });
      await prisma.trip.createMany({ data, skipDuplicates: true });
      tripCount += data.length;
      writeWatermark(watermarkPath, 'trip', lastId);
    }
    log(`Trip: ${tripCount}`);
    if (outOfRangeOperationDates > 0) {
      warn(
        `${outOfRangeOperationDates} rows have an operationDate outside the pre-created ` +
          `partition window (2013-01..2026-12) and landed in *_default — extend the ` +
          `20260608000100_partition_transactions range and reload to prune them properly.`,
      );
    }

    // 5. sampahmasuktpa → TpaInboundLog. `operation_date` is the physical monthly
    //    partition key (absent from the Prisma model), so insert via raw SQL.
    //    Keyset-batched + watermarked; idempotent via the existing-legacyId set.
    const existingTpa = new Set(
      (
        await prisma.tpaInboundLog.findMany({
          where: { legacyId: { not: null } },
          select: { legacyId: true },
        })
      ).map((t) => Number(t.legacyId)),
    );
    let tpaCount = 0;
    let tpaSkipped = 0;
    const tpaStart = flags.resume ? readWatermark(watermarkPath, 'tpa_inbound_log') : 0;
    for await (const { rows, lastId } of keysetBatches<LegacyTpaInbound>(
      (afterId, limit) =>
        query(conn, 'SELECT * FROM sampahmasuktpa WHERE id > ? ORDER BY id LIMIT ?', [
          afterId,
          limit,
        ]),
      (r) => r.id,
      flags.batchSize,
      tpaStart,
    )) {
      const values = rows.flatMap((r) => {
        if (existingTpa.has(r.id)) {
          tpaSkipped += 1;
          return [];
        }
        const date = parseDmyDate(r.tgltitle);
        if (!date || (flags.sinceYear && date.getUTCFullYear() < flags.sinceYear)) {
          tpaSkipped += 1;
          return [];
        }
        return [
          Prisma.sql`(${r.id}, ${r.tgltitle}, ${date}::date, ${date}::date, ${r.nopol}, ${r.lpsdepo}, ${r.trukasal}, ${r.bkotor}, ${r.bkosong}, ${r.bbersih}, now())`,
        ];
      });
      // Postgres caps a prepared statement at 32767 bind variables; each row
      // carries 10, so insert in sub-chunks well under that ceiling.
      const ROWS_PER_INSERT = 2000;
      for (let i = 0; i < values.length; i += ROWS_PER_INSERT) {
        const chunk = values.slice(i, i + ROWS_PER_INSERT);
        await prisma.$executeRaw`
          INSERT INTO "tpa_inbound_log"
            ("legacy_id", "date_label", "operation_date", "date", "plate_number", "depot",
             "source_truck", "gross_weight", "tare_weight", "net_weight", "updated_at")
          VALUES ${Prisma.join(chunk)}
        `;
        tpaCount += chunk.length;
      }
      writeWatermark(watermarkPath, 'tpa_inbound_log', lastId);
    }
    log(`TpaInboundLog: ${tpaCount} inserted${tpaSkipped ? `, ${tpaSkipped} skipped` : ''}`);
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  // Production target requires an explicit acknowledgement (guards seed:production
  // against an accidental run / destructive --force-reset).
  if (seedEnv === 'production' && !flags.confirmProduction) {
    throw new Error(
      'Refusing to run against production (SEED_ENV=production) without --confirm-production.',
    );
  }
  log(
    `Migration start (env=${seedEnv ?? 'local'} resume=${flags.resume} forceReset=${flags.forceReset} ` +
      `batch=${flags.batchSize} transactions=${flags.includeTransactions}); watermarks → ${WATERMARK_PATH}`,
  );

  await checkIdempotency(flags.forceReset, flags.includeTransactions);
  const sysUser = await ensureAuthBootstrap();

  await migrateMasterData();
  await migrateAuth();
  await migrateScheduling(sysUser, flags);
  await migrateAggregates(sysUser);

  // Generate the full set of valid routes (per operator rules) the legacy data
  // doesn't already cover — new data, idempotent.
  const routeStats = await completeRoutes(prisma);
  log(`Route completion: +${routeStats.generated} new routes (total ${routeStats.totalAfter}).`);

  if (flags.includeTransactions) {
    await migrateTransactions(sysUser, flags);
    log('Transactional history migrated (staging/production track).');
  } else {
    log('Master/auth/scheduling/aggregate migration complete (no --include-transactions).');
  }
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
