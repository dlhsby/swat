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
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

import type {
  LegacyCrewSchedule,
  LegacyDriver,
  LegacyDriverLicense,
  LegacyFuel,
  LegacyFuelCategory,
  LegacyFuelQuota,
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
  LegacyVehicleApplication,
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
  mapFuelQuota,
  mapLevy,
  mapLicenseClass,
  mapNameMap,
  mapRoute,
  mapSite,
  mapVehicle,
  mapVehicleApplication,
  mapVehicleModel,
  mapVehicleWasteSource,
  mapWasteSource,
} from './lib/mappers';
import { derivePermissionKeys } from './lib/permission-map';
import { connectLegacy, legacyDbConfigFromEnv, log, parseFlags, query, warn } from './lib/runtime';
import {
  dedupeRoutes,
  legacyTimeToDate,
  nonNegativeOrNull,
  routeDedupeKey,
} from './lib/transforms';

const prisma = new PrismaClient();
const NOW = new Date();

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
    throw new Error(
      'Migration already applied. Re-run with --force-reset to truncate & re-migrate.',
    );
  }
  if (forceReset) {
    warn('Force reset: truncating migrated tables (CASCADE).');
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "FuelQuota","TripTemplate","CrewSchedule","DriverLicense","Driver",
       "VehicleWasteSource","Vehicle","VehicleModel","WasteSource","Route","Site","Fuel",
       "FuelCategory","VehicleApplication","LicenseClass","DailyTonnage","Levy","LegacyNameMap"
       RESTART IDENTITY CASCADE`,
    );
  }
}

/** Resolve the system user id used for createdById attribution on migrated rows. */
async function systemUserId(): Promise<number> {
  const admin = await prisma.user.findFirst({ where: { username: 'admin' }, select: { id: true } });
  if (admin) {
    return admin.id;
  }
  throw new Error('No admin user found — run prisma:seed before migrating (system attribution).');
}

async function migrateMasterData(): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    const apps = await query<LegacyVehicleApplication>(conn, 'SELECT * FROM aplikasikendaraan');
    await prisma.vehicleApplication.createMany({
      data: apps.map((r) => mapVehicleApplication(r, NOW)),
      skipDuplicates: true,
    });
    log(`VehicleApplication: ${apps.length}`);

    const fuelCats = await query<LegacyFuelCategory>(conn, 'SELECT * FROM kategoribahanbakar');
    await prisma.fuelCategory.createMany({
      data: fuelCats.map((r) => mapFuelCategory(r, NOW)),
      skipDuplicates: true,
    });

    const fuels = await query<LegacyFuel>(conn, 'SELECT * FROM bahanbakar');
    await prisma.fuel.createMany({ data: fuels.map((r) => mapFuel(r, NOW)), skipDuplicates: true });

    const licenseClasses = await query<LegacyLicenseClass>(conn, 'SELECT * FROM sim');
    await prisma.licenseClass.createMany({
      data: licenseClasses.map((r) => mapLicenseClass(r, NOW)),
      skipDuplicates: true,
    });

    const sites = await query<LegacySite>(conn, 'SELECT * FROM spot');
    await prisma.site.createMany({ data: sites.map((r) => mapSite(r, NOW)), skipDuplicates: true });
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
      data: kept.map((r) => mapRoute(r, NOW)),
      skipDuplicates: true,
    });
    log(`Route: ${kept.length} kept, ${dropped.length} duplicates dropped`);

    const wasteSources = await query<LegacyWasteSource>(conn, 'SELECT * FROM kategorisumbersampah');
    await prisma.wasteSource.createMany({
      data: wasteSources.map((r) => mapWasteSource(r, NOW)),
      skipDuplicates: true,
    });

    const models = await query<LegacyVehicleModel>(conn, 'SELECT * FROM kategorikendaraan');
    await prisma.vehicleModel.createMany({
      data: models.map((r) => mapVehicleModel(r, NOW)),
      skipDuplicates: true,
    });

    const vehicles = await query<LegacyVehicle>(conn, 'SELECT * FROM kendaraan');
    await prisma.vehicle.createMany({
      data: vehicles.map((r) => mapVehicle(r, NOW)),
      skipDuplicates: true,
    });
    log(`Vehicle: ${vehicles.length}`);

    const vws = await query<LegacyVehicleWasteSource>(
      conn,
      'SELECT * FROM kategorisumbersampahkendaraan',
    );
    await prisma.vehicleWasteSource.createMany({
      data: vws.map(mapVehicleWasteSource),
      skipDuplicates: true,
    });

    const drivers = await query<LegacyDriver>(conn, 'SELECT * FROM pengemudi');
    await prisma.driver.createMany({
      data: drivers.map((r) => mapDriver(r, NOW)),
      skipDuplicates: true,
    });
    log(`Driver: ${drivers.length}`);

    const licenses = await query<LegacyDriverLicense>(conn, 'SELECT * FROM kepemilikansim');
    await prisma.driverLicense.createMany({
      data: licenses.map((r) => mapDriverLicense(r, NOW)),
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

    // Users — NEVER migrate MD5; random unusable hash + forced reset.
    const users = await query<LegacyUser>(conn, 'SELECT * FROM pengguna');
    let migrated = 0;
    for (const lu of users) {
      const roleId = roleByLegacy.get(lu.HAKAKSES_ID);
      if (!roleId) {
        warn(`No role for legacy user ${lu.PENGGUNA_ID}; skipping.`);
        continue;
      }
      const tempHash = await hash(randomUUID());
      await prisma.user.upsert({
        where: { username: lu.PENGGUNA_USERNAME || `legacy_${lu.PENGGUNA_ID}` },
        create: {
          legacyId: lu.PENGGUNA_ID,
          roleId,
          name: lu.PENGGUNA_NAMA || 'Legacy User',
          username: lu.PENGGUNA_USERNAME || `legacy_${lu.PENGGUNA_ID}`,
          passwordHash: tempHash,
          mustChangePassword: true,
        },
        update: { legacyId: lu.PENGGUNA_ID, roleId, mustChangePassword: true },
      });
      migrated += 1;
    }
    log(`User: ${migrated} migrated (all mustChangePassword=true, no MD5 copied)`);
  } finally {
    await conn.end();
  }
}

async function migrateScheduling(sysUser: number): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    const schedules = await query<LegacyCrewSchedule>(
      conn,
      'SELECT * FROM masterdetailtransaksiangkutsampah',
    );
    for (const s of schedules) {
      await prisma.crewSchedule.upsert({
        where: { legacyId: s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID },
        create: {
          legacyId: s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,
          vehicleId: s.KENDARAAN_ID,
          driverId: s.PENGEMUDI_ID,
          departTime:
            legacyTimeToDate(s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG) ?? NOW,
          returnTime:
            legacyTimeToDate(s.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG) ?? NOW,
        },
        update: {},
      });
    }
    log(`CrewSchedule: ${schedules.length}`);

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
      (await prisma.crewSchedule.findMany({ where: { legacyId: { not: null } } })).map((s) => [
        s.legacyId,
        s.id,
      ]),
    );
    const templates = await query<LegacyTripTemplate>(conn, 'SELECT * FROM mastertrayek');
    let tplCount = 0;
    for (const t of templates) {
      const crewScheduleId = scheduleByLegacy.get(t.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID);
      if (!crewScheduleId) {
        continue;
      }
      await prisma.tripTemplate.upsert({
        where: { legacyId: t.MASTERTRAYEK_ID },
        create: {
          legacyId: t.MASTERTRAYEK_ID,
          crewScheduleId,
          routeId: routeRemap.get(t.RUTE_ID) ?? t.RUTE_ID,
          targetTime: legacyTimeToDate(t.MASTERTRAYEK_WAKTUTARGET) ?? NOW,
          fuelRequestedLiters: nonNegativeOrNull(t.MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN),
        },
        update: {},
      });
      tplCount += 1;
    }
    log(`TripTemplate: ${tplCount}`);

    const quotas = await query<LegacyFuelQuota>(conn, 'SELECT * FROM jatahkitir');
    await prisma.fuelQuota.createMany({
      data: quotas.map((r) => mapFuelQuota(r, NOW, sysUser)),
      skipDuplicates: true,
    });
    log(`FuelQuota: ${quotas.length}`);
  } finally {
    await conn.end();
  }
}

async function migrateAggregates(sysUser: number): Promise<void> {
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
  const sysUser = await systemUserId();

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
