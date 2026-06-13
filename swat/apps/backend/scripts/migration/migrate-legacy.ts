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

import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

import { PERMISSION_CATALOG } from '../../src/common/auth/permission-catalog';

import type {
  LegacyScheduleTemplate,
  LegacyDriver,
  LegacyDriverLicense,
  LegacyFuel,
  LegacyFuelCategory,
  LegacyDisposalPermit,
  LegacyLevy,
  LegacyLicenseClass,
  LegacyNameMapRow,
  LegacyRole,
  LegacyRoute,
  LegacySite,
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
import { derivePermissionKeys } from './lib/permission-map';
import { connectLegacy, legacyDbConfigFromEnv, log, parseFlags, query, warn } from './lib/runtime';
import {
  dedupeRoutes,
  legacyTimeToDate,
  nonNegativeOrNull,
  resolveLegacyUsername,
  routeDedupeKey,
} from './lib/transforms';

const prisma = new PrismaClient();
const NOW = new Date();

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

async function checkIdempotency(forceReset: boolean): Promise<void> {
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

async function migrateScheduling(sysUser: string): Promise<void> {
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

    const quotas = await query<LegacyDisposalPermit>(conn, 'SELECT * FROM jatahkitir');
    await prisma.disposalPermit.createMany({
      data: quotas.map((r) => mapDisposalPermit(r, NOW, sysUser, vehicleMap, siteMap)),
      skipDuplicates: true,
    });
    log(`DisposalPermit: ${quotas.length}`);
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
    await prisma.legacyNameMap.createMany({
      data: nameMap.map((r) => mapNameMap(r, NOW)),
      skipDuplicates: true,
    });
    log(`Aggregates: tonnage=${tonnage.length} levy=${levies.length} nameMap=${nameMap.length}`);
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const watermarkPath = join(__dirname, 'reports', 'watermark.json');
  log(
    `Migration start (resume=${flags.resume} forceReset=${flags.forceReset} batch=${flags.batchSize}); watermarks → ${watermarkPath}`,
  );

  await checkIdempotency(flags.forceReset);
  const sysUser = await ensureAuthBootstrap();

  await migrateMasterData();
  await migrateAuth();
  await migrateScheduling(sysUser);
  await migrateAggregates(sysUser);

  // TODO(T-155 — revisit with live data): implement the transactional history
  // load (trayek→Trip, transaksiangkutsampah→Haul, detailtransaksiangkutsampah→
  // HaulAssignment, sampahmasuktpa→TpaInboundLog). It is empty in the sample
  // snapshot and is the live-only heavy path, so it cannot be written/verified
  // against real data here. The building blocks are in place and unit-tested —
  // keysetBatches + readWatermark/writeWatermark (lib/pagination.ts), the enum
  // maps, and the PK-preserve strategy. When the live DB is available:
  //   1. migrate oldest→newest (ORDER BY operationDate) into the pre-created
  //      monthly partitions; denormalize operationDate from TransactionDay.date.
  //   2. batch 10k rows; persist a per-table watermark for --resume.
  //   3. reconcile per-year (not just per-table) in verify-migration.ts.
  // See specs/04-migration.md §3.1 and scripts/migration/README.md §Transactions.
  log(
    'Master/auth/scheduling/aggregate migration complete. Transactional history is the live-only streamed phase — see TODO(T-155) + README §Transactions.',
  );
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
