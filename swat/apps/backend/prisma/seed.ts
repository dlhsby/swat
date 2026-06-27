/**
 * Database seed (demo track — `pnpm db:seed` / `seed:demo`).
 *
 * Populates:
 *  1. Permission catalog (specs/06-auth-rbac.md §2.2).
 *  2. Roles + role→permission grants (specs/06-auth-rbac.md §2.3).
 *  3. Admin user (Argon2id hash; no forced reset) + a dev-only `adminreset`
 *     demo account with mustChangePassword=true, plus one demo user per role.
 *  4. Reference/lookup data (specs/01-glossary.md §4): LicenseClass,
 *     FuelCategory, Fuel, VehicleType, WasteSource — and the SLIM curated demo
 *     master subset (sites, routes, vehicles, drivers, licenses, schedule/trip
 *     templates) from `demo-fixtures.ts` (derived from the legacy snapshot by
 *     scripts/build-demo-fixtures.ts).
 *  5. Demo levy/retribusi rows (24 months, by category) for the Retribusi dashboard.
 *  6. Synthetic transactional data across the ~15 curated demo vehicles (a year of
 *     disposal + refuel trips, TPA weighbridge logs, vehicle↔waste-source links,
 *     kitir) so partition pruning and every Phase-2 monitoring dashboard (tonnage
 *     by day/source/site, BBM variance, route activity, TPA reconciliation) has
 *     multi-dimensional data.
 *  7. Demo vehicle inspections + maintenance (with items) and placeholder photos
 *     so the operations CRUD pages aren't empty.
 *  8. Auto rollup backfill over the seeded range — the monitoring aggregates are
 *     populated in the same run (no separate `rollup:backfill` step needed).
 *     Items 5–8 are gated by SEED_SYNTHETIC (default true).
 *
 * Idempotent: every write is an upsert or guarded create; re-running is safe.
 * The legacy/staging/production tracks load from MySQL via `migrate:legacy` and
 * never touch this synthetic data.
 */
import {
  type DayStatus,
  type DeviationSeverity,
  type DeviationType,
  type InspectionItemStatus,
  type InspectionResult,
  type MaintenanceStatus,
  type MaintenanceType,
  Prisma,
  PrismaClient,
  RouteCategory,
  SiteType,
  TripStatus,
} from '@prisma/client';
import { hash } from 'argon2';

import {
  PERMISSION_CATALOG,
  describePermission,
  expandPatterns,
} from '../src/common/auth/permission-catalog';
import { pgAdapter } from '../src/common/prisma/pg-adapter';
import { RollupRepository } from '../src/modules/analytics/rollup.repository';
import { RollupService } from '../src/modules/analytics/rollup.service';
import { GpsEfficiencyRepository } from '../src/modules/integrations/gps/gps-efficiency.repository';
import { GpsEfficiencyService } from '../src/modules/integrations/gps/gps-efficiency.service';
import { type PrismaService } from '../src/modules/prisma/prisma.service';

import {
  DEMO_DRIVER_LICENSES,
  DEMO_DRIVERS,
  DEMO_ROUTES,
  DEMO_SCHEDULE_TEMPLATES,
  DEMO_SITES,
  DEMO_TRIP_TEMPLATES,
  DEMO_VEHICLE_MODELS,
  DEMO_VEHICLES,
} from './demo-fixtures';

const prisma = new PrismaClient({ adapter: pgAdapter() });

// Default admin password — meets the policy in specs/06-auth-rbac.md §1.4
// (≥12 chars, upper/lower/digit/symbol). Forced to change on first login.
const ADMIN_DEFAULT_PASSWORD = 'Password123!';

// Argon2id parameters per specs/06-auth-rbac.md §1.1.
const ARGON2_OPTIONS = {
  type: 2, // argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// ---------------------------------------------------------------------------
// 1. Permission catalog — the keys/descriptions/expansion live in the shared
//    source of truth (src/common/auth/permission-catalog.ts) so the seed, the
//    boot-time reconcile, and the API stay in lockstep.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Roles (names + permission patterns) — specs/06-auth-rbac.md §2.3
// ---------------------------------------------------------------------------
const ROLES: ReadonlyArray<{ name: string; patterns: readonly string[] }> = [
  { name: 'Administrator', patterns: ['*:*'] },
  {
    name: 'Administrasi Data',
    patterns: [
      '*:read',
      '*:create',
      '*:update',
      'trip:verify',
      'trip:override',
      'trip:record-pickup',
      'trip:record-disposal',
      'trip:record-fuel',
      'fuel:approve',
      'transaction-day:manage',
      // GPS tracking admin (Phase 7) — manage the device registry, draw route
      // corridors, tune deviation rules, and acknowledge alerts. (`*:read`
      // already grants gps-device:read / deviation-alert:read / tracking:read.)
      'gps-device:manage',
      'route-geometry:manage',
      // A route owns 1..N corridors (Phase 7.8) — delete isn't covered by the
      // `*:create/update/read` wildcards above, so grant it explicitly.
      'corridor:delete',
      'deviation-rule:manage',
      'deviation-alert:acknowledge',
    ],
  },
  { name: 'Checker', patterns: ['vehicle:read', 'driver:read', 'trip:read', 'trip:verify'] },
  {
    name: 'Operator Pool',
    patterns: ['vehicle:read', 'driver:read', 'schedule-template:read', 'trip:read', 'trip:update'],
  },
  { name: 'Petugas TPA', patterns: ['site:read', 'trip:read', 'trip:record-disposal'] },
  // Weighbridge operators (TPA "Jembatan Timbang") — resolve a kitir and post the
  // weighing result via the Phase-4 integration API (specs/09-modules/integration-weighbridge.md).
  {
    name: 'Petugas Timbang',
    patterns: [
      'site:read',
      'trip:read',
      // `trip:update` lets the (bearer-authenticated) weighbridge operator attach
      // the CCTV capture image to the weighing's trip via POST /trips/:id/photos
      // — legacy `uploadgambar` → dokumentasitrayek parity. The weighing itself
      // posts through weighbridge:post; this only adds trip-documentation rights.
      'trip:update',
      'disposal-permit:read',
      'weighbridge:resolve',
      'weighbridge:post',
      'weighbridge:update',
      'weighbridge:read',
    ],
  },
  // Role assigned to integration ServiceAccounts (machine credentials). The
  // unattended TPA desktop app authenticates with an API key bearing this role —
  // resolve/post/update/read weighings, no interactive UI permissions.
  {
    name: 'Integrasi Timbang',
    patterns: ['weighbridge:resolve', 'weighbridge:post', 'weighbridge:update', 'weighbridge:read'],
  },
  {
    name: 'Supervisor',
    patterns: [
      '*:read',
      'monitoring:read',
      'report:read',
      'report:export',
      'transaction-day:read',
      // GPS tracking (Phase 7) — watch the live fleet + acknowledge route
      // deviations. (`*:read` already grants tracking:read / deviation-alert:read.)
      'deviation-alert:acknowledge',
    ],
  },
];

const SERVICE_ACCOUNT_ROLE = 'Integrasi Timbang';

async function seedPermissions(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const { key } of PERMISSION_CATALOG) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { description: describePermission(key) },
      create: { key, description: describePermission(key) },
    });
    idByKey.set(key, permission.id);
  }
  return idByKey;
}

/**
 * Default deviation rules (Phase 7, T-709) — one per type, with sensible starting
 * thresholds operators tune later. Always seeded (operational config, not synthetic
 * demo data); idempotent upsert by type.
 */
async function seedDeviationRules(): Promise<void> {
  const rules: ReadonlyArray<{
    deviationType: DeviationType;
    threshold: number | null;
    hysteresisSec: number;
    severity: DeviationSeverity;
  }> = [
    { deviationType: 'off_corridor', threshold: 150, hysteresisSec: 30, severity: 'WARNING' },
    { deviationType: 'off_sequence', threshold: null, hysteresisSec: 0, severity: 'WARNING' },
    { deviationType: 'dwell_too_long', threshold: 600, hysteresisSec: 0, severity: 'INFO' },
    { deviationType: 'late_to_schedule', threshold: 900, hysteresisSec: 0, severity: 'INFO' },
  ];
  for (const rule of rules) {
    await prisma.deviationRule.upsert({
      where: { deviationType: rule.deviationType },
      update: {},
      create: { ...rule, enabled: true },
    });
  }
}

async function seedRoles(permissionIdByKey: Map<string, string>): Promise<Map<string, string>> {
  const idByName = new Map<string, string>();
  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name },
    });
    idByName.set(role.name, record.id);

    const keys = expandPatterns(role.patterns);
    await prisma.rolePermission.deleteMany({ where: { roleId: record.id } });
    await prisma.rolePermission.createMany({
      data: keys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => id !== undefined)
        .map((permissionId) => ({ roleId: record.id, permissionId })),
      skipDuplicates: true,
    });
  }
  return idByName;
}

async function seedAdminUser(adminRoleId: string): Promise<void> {
  const passwordHash = await hash(ADMIN_DEFAULT_PASSWORD, ARGON2_OPTIONS);
  const isProd = process.env.NODE_ENV === 'production';
  const authOnly = process.env.SEED_AUTH_ONLY === 'true';

  // Primary admin — ready to use, no forced reset. Outside production, re-seeding
  // restores the documented bootstrap credential (admin / Password123!) AND its
  // Administrator role even if a prior legacy load reassigned it (re-seedable),
  // keeping local/CI runs repeatable; in production we never clobber a real admin.
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: isProd ? {} : { passwordHash, mustChangePassword: false, roleId: adminRoleId },
    create: {
      username: 'admin',
      name: 'Administrator',
      passwordHash,
      roleId: adminRoleId,
      mustChangePassword: false,
    },
  });

  // Dev/CI-only demo account for exercising the forced first-login password
  // change (adminreset / Password123!, mustChangePassword=true). Skipped in
  // production AND in auth-only mode (the clean base for a legacy-only load), so
  // it can't become a stray privileged account.
  if (!isProd && !authOnly) {
    await prisma.user.upsert({
      where: { username: 'adminreset' },
      update: { passwordHash, mustChangePassword: true },
      create: {
        username: 'adminreset',
        name: 'Administrator (Reset Demo)',
        passwordHash,
        roleId: adminRoleId,
        mustChangePassword: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Reference / lookup data
// ---------------------------------------------------------------------------
const LICENSE_CLASSES = ['A', 'BI', 'BI Umum', 'BII', 'BII Umum', 'C', 'D'];

const FUEL_CATEGORIES = ['Bersubsidi', 'Non-Subsidi'];

const FUELS: ReadonlyArray<{ name: string; category: string; pricePerLiter: number }> = [
  { name: 'Premium', category: 'Bersubsidi', pricePerLiter: 10000 },
  { name: 'Pertalite', category: 'Bersubsidi', pricePerLiter: 10000 },
  { name: 'Solar', category: 'Bersubsidi', pricePerLiter: 6800 },
  { name: 'Pertamax', category: 'Non-Subsidi', pricePerLiter: 13500 },
  { name: 'Solar Keekonomian', category: 'Non-Subsidi', pricePerLiter: 14000 },
  { name: 'Dexlite', category: 'Non-Subsidi', pricePerLiter: 14500 },
];

// All vehicle types loaded verbatim from the legacy `aplikasikendaraan` table
// (legacyId = APLIKASIKENDARAAN_ID), so the seed matches production master data.
const VEHICLE_TYPES: ReadonlyArray<{ legacyId: number; name: string }> = [
  { legacyId: 1, name: 'Compector' },
  { legacyId: 2, name: 'Compector Modif Tangki' },
  { legacyId: 3, name: 'Dump Truck' },
  { legacyId: 4, name: 'Hyd. Cont. / Arm Roll 6M3' },
  { legacyId: 5, name: 'Hyd. Cont. / Arm Roll 8M3' },
  { legacyId: 6, name: 'Hyd. Cont. / Arm Roll 14M3' },
  { legacyId: 7, name: 'Truck Tangki' },
  { legacyId: 8, name: 'Truck Tangki Air' },
  { legacyId: 9, name: 'Truck Bak' },
  { legacyId: 10, name: 'Truck Sky Wolker' },
  { legacyId: 11, name: 'Pick Up' },
  { legacyId: 12, name: 'Pick Up Double Cabin' },
  { legacyId: 13, name: 'Pick Up Sky Wolker ' },
  { legacyId: 14, name: 'Station Wagon' },
  { legacyId: 15, name: 'Jeep Taft GT' },
  { legacyId: 16, name: 'Kendaraan Non-Dinas' },
  { legacyId: 17, name: 'Roda Tiga' },
  { legacyId: 18, name: 'Buldozer' },
  { legacyId: 19, name: 'Eskavator' },
  { legacyId: 20, name: 'DRUM' },
  { legacyId: 21, name: 'Mesin Press' },
  { legacyId: 22, name: 'Loader' },
  { legacyId: 23, name: 'Mobil Toilet' },
  { legacyId: 24, name: 'Pick Up (S)' },
  { legacyId: 25, name: 'Road Swipper' },
  { legacyId: 26, name: 'Forklift' },
  { legacyId: 27, name: 'Roda Dua' },
  { legacyId: 28, name: 'SelfLoader' },
];

// The six waste sources are distinct categories (legacy `kategorisumbersampah`).
// The monitoring "Semua / Non-Swasta / Swasta" filter derives from the code
// ('S' = Swasta) — no ownership column needed.
const WASTE_SOURCES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'D', name: 'Dinas' },
  { code: 'R', name: 'Rekanan' },
  { code: 'PS', name: 'Pasar' },
  { code: 'PU', name: 'Pintu Air' },
  { code: 'PL', name: 'Pelabuhan' },
  { code: 'S', name: 'Swasta' },
];

async function seedReferenceData(): Promise<void> {
  for (const name of LICENSE_CLASSES) {
    const existing = await prisma.licenseClass.findFirst({ where: { name } });
    if (!existing) {
      await prisma.licenseClass.create({ data: { name } });
    }
  }

  const categoryIdByName = new Map<string, string>();
  for (const name of FUEL_CATEGORIES) {
    const existing = await prisma.fuelCategory.findFirst({ where: { name } });
    const record = existing ?? (await prisma.fuelCategory.create({ data: { name } }));
    categoryIdByName.set(name, record.id);
  }

  const fuelIdByName = new Map<string, string>();
  for (const fuel of FUELS) {
    const existing = await prisma.fuel.findFirst({ where: { name: fuel.name } });
    const record =
      existing ??
      (await prisma.fuel.create({
        data: {
          name: fuel.name,
          pricePerLiter: fuel.pricePerLiter,
          fuelCategoryId: categoryIdByName.get(fuel.category)!,
        },
      }));
    fuelIdByName.set(fuel.name, record.id);
  }

  const vehicleTypeIdByLegacy = new Map<number, string>();
  for (const vehicleType of VEHICLE_TYPES) {
    const record = await prisma.vehicleType.upsert({
      where: { legacyId: vehicleType.legacyId },
      update: { name: vehicleType.name },
      create: { legacyId: vehicleType.legacyId, name: vehicleType.name },
    });
    vehicleTypeIdByLegacy.set(vehicleType.legacyId, record.id);
  }

  // Demo vehicle models (subset of legacy `kategorikendaraan`): resolve the
  // vehicle-type FK by legacyId and the fuel FK by the legacy bahanbakar id.
  const FUEL_NAME_BY_LEGACY: Record<number, string> = {
    1: 'Premium',
    2: 'Pertamax',
    3: 'Solar Keekonomian',
    4: 'Solar',
    5: 'Pertalite',
    6: 'Dexlite',
  };
  const modelIdByLegacy = new Map<number, string>();
  for (const model of DEMO_VEHICLE_MODELS) {
    const vehicleTypeId = vehicleTypeIdByLegacy.get(model.appLegacyId);
    const fuelId = fuelIdByName.get(FUEL_NAME_BY_LEGACY[model.fuelLegacyId] ?? '');
    if (vehicleTypeId === undefined || fuelId === undefined) {
      continue;
    }
    const data = {
      brand: model.brand,
      vehicleTypeId,
      fuelId,
      fuelTankCapacity: model.fuelTankCapacity,
      normalFuelRatio: model.normalFuelRatio,
      normalTareWeight: model.normalTareWeight,
      maxNetLoad: model.maxNetLoad,
      maxNetVolume: model.maxNetVolume,
      wheelCount: model.wheelCount,
    };
    const record = await prisma.vehicleModel.upsert({
      where: { legacyId: model.legacyId },
      update: data,
      create: { legacyId: model.legacyId, ...data },
    });
    modelIdByLegacy.set(model.legacyId, record.id);
  }

  // Curated demo master data (spot → site, rute → route, kendaraan → vehicle),
  // inserted in FK order. Each is idempotent via skipDuplicates on the unique
  // legacyId; rows whose FKs don't resolve are skipped and counted.
  const siteIdByLegacy = await seedDemoSites();
  const routeIdByLegacy = await seedDemoRoutes(siteIdByLegacy);
  const vehicleIdByLegacy = await seedDemoVehicles(siteIdByLegacy, modelIdByLegacy);
  const driverIdByLegacy = await seedDemoDrivers(siteIdByLegacy);
  await seedDemoDriverLicenses(driverIdByLegacy);
  // Scheduling templates depend on vehicles + drivers; trip templates additionally
  // on routes + sites (snapshot). Mirror the legacy planner verbatim.
  const scheduleIdByLegacy = await seedDemoScheduleTemplates(vehicleIdByLegacy, driverIdByLegacy);
  await seedDemoTripTemplates(scheduleIdByLegacy, routeIdByLegacy, siteIdByLegacy);

  for (const source of WASTE_SOURCES) {
    await prisma.wasteSource.upsert({
      where: { code: source.code },
      update: { name: source.name },
      create: { code: source.code, name: source.name },
    });
  }
}

/** Demo sites (spot). Returns the legacyId → uuid map for routes/vehicles. */
async function seedDemoSites(): Promise<Map<number, string>> {
  await prisma.site.createMany({
    data: DEMO_SITES.map((s) => ({
      legacyId: s.legacyId,
      type: s.type,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    skipDuplicates: true,
  });
  const rows = await prisma.site.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const map = new Map<number, string>();
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  // eslint-disable-next-line no-console
  console.log(`Demo sites: ${DEMO_SITES.length} loaded`);
  return map;
}

/** Demo routes (rute) — origin/destination resolved via the site map.
 * Returns the legacyId → uuid map for trip-template snapshots. */
async function seedDemoRoutes(siteIdByLegacy: Map<number, string>): Promise<Map<number, string>> {
  let skipped = 0;
  const data = DEMO_ROUTES.flatMap((r) => {
    const originSiteId = siteIdByLegacy.get(r.originLegacyId);
    const destinationSiteId = siteIdByLegacy.get(r.destinationLegacyId);
    if (originSiteId === undefined || destinationSiteId === undefined) {
      skipped += 1;
      return [];
    }
    return [
      {
        legacyId: r.legacyId,
        category: r.category,
        originSiteId,
        destinationSiteId,
        distanceKm: r.distanceKm,
      },
    ];
  });
  await prisma.route.createMany({ data, skipDuplicates: true });
  const rows = await prisma.route.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const map = new Map<number, string>();
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  // eslint-disable-next-line no-console
  console.log(
    `Demo routes: ${data.length} loaded${skipped ? `, ${skipped} skipped (unresolved site)` : ''}`,
  );
  return map;
}

/** Demo vehicles (kendaraan) — pool + model resolved via maps; 0000 dates → fallback. */
async function seedDemoVehicles(
  siteIdByLegacy: Map<number, string>,
  modelIdByLegacy: Map<number, string>,
): Promise<Map<number, string>> {
  const FALLBACK_DATE = new Date('2020-01-01T00:00:00.000Z');
  let skipped = 0;
  const data = DEMO_VEHICLES.flatMap((v) => {
    const poolSiteId = siteIdByLegacy.get(v.poolLegacyId);
    const modelId = modelIdByLegacy.get(v.modelLegacyId);
    if (poolSiteId === undefined || modelId === undefined) {
      skipped += 1;
      return [];
    }
    return [
      {
        legacyId: v.legacyId,
        poolSiteId,
        modelId,
        status: v.status,
        plateNumber: v.plateNumber,
        needsPlateReview: v.needsPlateReview,
        chassisNumber: v.chassisNumber,
        engineNumber: v.engineNumber,
        manufactureYear: v.manufactureYear,
        currentFuelRatio: v.currentFuelRatio,
        currentTareWeight: v.currentTareWeight,
        currentOdometer: v.currentOdometer,
        registrationExpiry: v.registrationExpiry ? new Date(v.registrationExpiry) : FALLBACK_DATE,
        taxExpiry: v.taxExpiry ? new Date(v.taxExpiry) : FALLBACK_DATE,
        notes: v.notes,
      },
    ];
  });
  // Upsert (not createMany) so re-seeding UPDATES existing rows. Chunked to bound
  // concurrency against the connection pool.
  const CHUNK = 25;
  for (let i = 0; i < data.length; i += CHUNK) {
    await Promise.all(
      data.slice(i, i + CHUNK).map(({ legacyId, ...rest }) =>
        prisma.vehicle.upsert({
          where: { legacyId },
          update: rest,
          create: { legacyId, ...rest },
        }),
      ),
    );
  }
  const rows = await prisma.vehicle.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const map = new Map<number, string>();
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  // eslint-disable-next-line no-console
  console.log(
    `Demo vehicles: ${data.length} upserted${skipped ? `, ${skipped} skipped (unresolved pool/model)` : ''}`,
  );
  return map;
}

/** Demo drivers (pengemudi) — pool resolved via the site map. Returns the
 * legacyId → uuid map for licenses. */
async function seedDemoDrivers(siteIdByLegacy: Map<number, string>): Promise<Map<number, string>> {
  const FALLBACK_BIRTH = new Date('1970-01-01T00:00:00.000Z');
  let skipped = 0;
  const data = DEMO_DRIVERS.flatMap((d) => {
    const poolSiteId = siteIdByLegacy.get(d.poolLegacyId);
    if (poolSiteId === undefined) {
      skipped += 1;
      return [];
    }
    return [
      {
        legacyId: d.legacyId,
        poolSiteId,
        employmentStatus: d.employmentStatus,
        name: d.name,
        idCardNumber: d.idCardNumber,
        originAddress: d.originAddress,
        currentAddress: d.currentAddress,
        birthDate: d.birthDate ? new Date(d.birthDate) : FALLBACK_BIRTH,
        contact: d.contact,
        safetyTraining: d.safetyTraining,
        notes: d.notes,
      },
    ];
  });
  await prisma.driver.createMany({ data, skipDuplicates: true });
  const rows = await prisma.driver.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const map = new Map<number, string>();
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  // eslint-disable-next-line no-console
  console.log(`Demo drivers: ${data.length} loaded${skipped ? `, ${skipped} skipped` : ''}`);
  return map;
}

/** Demo driver licenses (kepemilikansim) — driver via map, class by name. */
async function seedDemoDriverLicenses(driverIdByLegacy: Map<number, string>): Promise<void> {
  const FALLBACK_EXPIRY = new Date('2020-01-01T00:00:00.000Z');
  const classes = await prisma.licenseClass.findMany({ select: { id: true, name: true } });
  const classIdByName = new Map(classes.map((c) => [c.name, c.id]));
  let skipped = 0;
  const data = DEMO_DRIVER_LICENSES.flatMap((l) => {
    const driverId = driverIdByLegacy.get(l.driverLegacyId);
    const licenseClassId = classIdByName.get(l.licenseClassName);
    if (driverId === undefined || licenseClassId === undefined) {
      skipped += 1;
      return [];
    }
    return [
      {
        legacyId: l.legacyId,
        driverId,
        licenseClassId,
        licenseNumber: l.licenseNumber,
        expiry: l.expiry ? new Date(l.expiry) : FALLBACK_EXPIRY,
      },
    ];
  });
  await prisma.driverLicense.createMany({ data, skipDuplicates: true });
  // eslint-disable-next-line no-console
  console.log(`Demo licenses: ${data.length} loaded${skipped ? `, ${skipped} skipped` : ''}`);
}

/** "HH:mm:ss" → a 1970-01-01 UTC time (Prisma @db.Time); null → fallback hour. */
function legacyTime(value: string | null, fallbackHour: number): Date {
  const m = value ? /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value) : null;
  if (!m) {
    return new Date(Date.UTC(1970, 0, 1, fallbackHour, 0));
  }
  return new Date(Date.UTC(1970, 0, 1, Number(m[1]), Number(m[2]), Number(m[3] ?? '0')));
}

/** Demo schedule templates (masterdetailtransaksiangkutsampah) — vehicle + driver
 * resolved via maps. Returns the legacyId → uuid map for trip templates. */
async function seedDemoScheduleTemplates(
  vehicleIdByLegacy: Map<number, string>,
  driverIdByLegacy: Map<number, string>,
): Promise<Map<number, string>> {
  let skipped = 0;
  const data = DEMO_SCHEDULE_TEMPLATES.flatMap((s) => {
    const vehicleId = vehicleIdByLegacy.get(s.vehicleLegacyId);
    const driverId = driverIdByLegacy.get(s.driverLegacyId);
    if (vehicleId === undefined || driverId === undefined) {
      skipped += 1;
      return [];
    }
    return [
      {
        legacyId: s.legacyId,
        vehicleId,
        driverId,
        departTime: legacyTime(s.departTime, 5),
        returnTime: legacyTime(s.returnTime, 15),
      },
    ];
  });
  await prisma.scheduleTemplate.createMany({ data, skipDuplicates: true });
  const rows = await prisma.scheduleTemplate.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const map = new Map<number, string>();
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  // eslint-disable-next-line no-console
  console.log(
    `Demo schedule templates: ${data.length} loaded${skipped ? `, ${skipped} skipped (unresolved vehicle/driver)` : ''}`,
  );
  return map;
}

/** Demo trip templates (mastertrayek) — parent schedule + route + snapshot
 * sites resolved via maps. Keeps the route_id FK and its denormalized snapshot. */
async function seedDemoTripTemplates(
  scheduleIdByLegacy: Map<number, string>,
  routeIdByLegacy: Map<number, string>,
  siteIdByLegacy: Map<number, string>,
): Promise<void> {
  let skipped = 0;
  const data = DEMO_TRIP_TEMPLATES.flatMap((t) => {
    const scheduleTemplateId = scheduleIdByLegacy.get(t.scheduleLegacyId);
    const routeId = routeIdByLegacy.get(t.routeLegacyId);
    const originSiteId = siteIdByLegacy.get(t.originLegacyId);
    const destinationSiteId = siteIdByLegacy.get(t.destinationLegacyId);
    if (
      scheduleTemplateId === undefined ||
      routeId === undefined ||
      originSiteId === undefined ||
      destinationSiteId === undefined
    ) {
      skipped += 1;
      return [];
    }
    return [
      {
        legacyId: t.legacyId,
        scheduleTemplateId,
        routeId,
        routeCategory: t.routeCategory,
        originSiteId,
        destinationSiteId,
        targetTime: legacyTime(t.targetTime, 6),
        fuelRequestedLiters: t.fuelRequestedLiters,
      },
    ];
  });
  const CHUNK = 500;
  for (let i = 0; i < data.length; i += CHUNK) {
    await prisma.tripTemplate.createMany({ data: data.slice(i, i + CHUNK), skipDuplicates: true });
  }
  // eslint-disable-next-line no-console
  console.log(
    `Demo trip templates: ${data.length} loaded${skipped ? `, ${skipped} skipped (unresolved fk)` : ''}`,
  );
}

// ---------------------------------------------------------------------------
// 5. Levy / retribusi (monthly, by category) — feeds the Retribusi dashboard.
//    24 monthly anchors so the trend charts span two years.
// ---------------------------------------------------------------------------
const LEVY_CATEGORIES: ReadonlyArray<{ name: string; baseAmount: number }> = [
  { name: 'Rumah Tangga', baseAmount: 15_000_000 },
  { name: 'Komersial', baseAmount: 28_000_000 },
  { name: 'Industri', baseAmount: 45_000_000 },
  { name: 'Pasar', baseAmount: 12_000_000 },
  { name: 'Hotel & Restoran', baseAmount: 22_000_000 },
];

const LEVY_MONTHS = 24;

async function seedLevies(): Promise<void> {
  const rng = makeRng(20260610);
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  // 24 monthly anchors (first-of-month) ending in the run month, so the trend is
  // always current (e.g. seeded in 2026-06 → 2024-07 … 2026-06).
  const endMonth = SYNTHETIC_END.getUTCMonth();
  const endYear = SYNTHETIC_END.getUTCFullYear();
  for (let m = 0; m < LEVY_MONTHS; m += 1) {
    const date = dateOnly(endYear, endMonth - (LEVY_MONTHS - 1 - m), 1);
    for (const category of LEVY_CATEGORIES) {
      const existing = await prisma.levy.findFirst({
        where: { categoryName: category.name, date },
        select: { id: true },
      });
      if (existing) {
        continue; // idempotent — already seeded this category-month
      }
      const amount = Math.round(category.baseAmount * (0.85 + rng() * 0.3));
      await prisma.levy.create({
        data: {
          categoryName: category.name,
          date,
          amount: BigInt(amount),
          createdById: admin?.id ?? null,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Synthetic transactional data across the curated demo fleet
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random generator (no Math.random — reproducible seeds). */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function dateOnly(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

/** Today as a UTC date-only anchor, so the demo window always ends on the run
 *  date (the dashboards default to the last 7 days — a fixed past anchor would
 *  leave that window empty). Determinism of the *values* comes from the seeded
 *  RNG, which is independent of this date. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const SYNTHETIC_DAYS = 365;
const SYNTHETIC_END = todayUtc(); // anchored to the run date so default views show data

interface DemoVehicleRef {
  id: string;
  plateNumber: string;
  tareWeight: number;
}

interface DemoFleet {
  vehicles: DemoVehicleRef[];
  driverIds: string[];
  disposalRouteIds: string[];
  refuelRouteIds: string[];
}

/** Load the curated demo fleet (vehicles, drivers, disposal/refuel routes) the
 * synthetic loop attaches transactions to. */
async function loadDemoFleet(): Promise<DemoFleet> {
  const vehicleRows = await prisma.vehicle.findMany({
    where: { legacyId: { not: null } },
    orderBy: { legacyId: 'asc' },
    take: 15,
    include: { model: { select: { normalTareWeight: true } } },
  });
  const vehicles = vehicleRows.map((v) => ({
    id: v.id,
    plateNumber: v.plateNumber,
    tareWeight: v.currentTareWeight || v.model?.normalTareWeight || 8000,
  }));
  const drivers = await prisma.driver.findMany({
    where: { legacyId: { not: null } },
    orderBy: { legacyId: 'asc' },
    take: 15,
    select: { id: true },
  });
  const disposal = await prisma.route.findMany({
    where: { category: RouteCategory.DISPOSAL },
    orderBy: { legacyId: 'asc' },
    select: { id: true },
  });
  const refuel = await prisma.route.findMany({
    where: { category: RouteCategory.REFUEL },
    orderBy: { legacyId: 'asc' },
    select: { id: true },
  });
  return {
    vehicles,
    driverIds: drivers.map((d) => d.id),
    disposalRouteIds: disposal.map((r) => r.id),
    refuelRouteIds: refuel.map((r) => r.id),
  };
}

/** Link each demo vehicle to a waste source (round-robin across all six) so the
 * by-source breakdown + Semua/Non-Swasta/Swasta toggle have multi-source data. */
async function linkDemoWasteSources(vehicles: DemoVehicleRef[]): Promise<void> {
  const sources = await prisma.wasteSource.findMany({
    orderBy: { code: 'asc' },
    select: { id: true },
  });
  if (sources.length === 0) return;
  for (let i = 0; i < vehicles.length; i += 1) {
    const vehicle = vehicles[i];
    const source = sources[i % sources.length];
    if (!vehicle || !source) continue;
    await prisma.vehicleWasteSource.upsert({
      where: { vehicleId_wasteSourceId: { vehicleId: vehicle.id, wasteSourceId: source.id } },
      update: {},
      create: { vehicleId: vehicle.id, wasteSourceId: source.id },
    });
  }
}

/** A few demo kitir (DisposalPermit) so the Jatah Kitir page exercises both
 * status pills. Idempotent on the permit code. */
async function seedDemoPermits(vehicles: DemoVehicleRef[], adminId: string | null): Promise<void> {
  const tpa = await prisma.site.findFirst({
    where: { type: SiteType.TPA },
    orderBy: { legacyId: 'asc' },
    select: { id: true },
  });
  if (!tpa || vehicles.length === 0) return;
  const permits = vehicles.slice(0, 3).map((v, i) => ({
    code: `KITIR-DEMO-${String(i + 1).padStart(2, '0')}`,
    vehicleId: v.id,
    status: i === 2 ? ('INACTIVE' as const) : ('ACTIVE' as const),
    from: i === 2 ? dateOnly(2025, 0, 1) : dateOnly(2026, 0, 1),
    to: i === 2 ? dateOnly(2025, 11, 31) : dateOnly(2026, 11, 31),
  }));
  for (const permit of permits) {
    if (await prisma.disposalPermit.findFirst({ where: { code: permit.code } })) {
      continue;
    }
    await prisma.disposalPermit.create({
      data: {
        code: permit.code,
        vehicleId: permit.vehicleId,
        siteId: tpa.id,
        status: permit.status,
        issuedAt: permit.from,
        validFrom: permit.from,
        validTo: permit.to,
        createdById: adminId,
      },
    });
  }
}

/** A year of operational days across the whole demo fleet. Returns the seeded
 * date range for the rollup backfill. Idempotent: a day that already has hauls
 * is left untouched. */
async function seedDemoTransactions(fleet: DemoFleet): Promise<{ from: Date; to: Date } | null> {
  const { vehicles, driverIds, disposalRouteIds, refuelRouteIds } = fleet;
  if (vehicles.length === 0 || disposalRouteIds.length === 0 || driverIds.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('Demo transactions skipped — missing curated vehicles/drivers/disposal routes.');
    return null;
  }
  const rng = makeRng(20260608);
  const status: TripStatus = TripStatus.DONE;
  const dayStatus: DayStatus = 'DONE';

  for (let offset = SYNTHETIC_DAYS - 1; offset >= 0; offset -= 1) {
    const opDate = new Date(SYNTHETIC_END);
    opDate.setUTCDate(SYNTHETIC_END.getUTCDate() - offset);

    const day =
      (await prisma.transactionDay.findUnique({ where: { date: opDate } })) ??
      (await prisma.transactionDay.create({ data: { date: opDate, status: dayStatus } }));

    // Skip days an earlier run already populated (preserves prior seed).
    if ((await prisma.haul.count({ where: { operationDate: opDate } })) > 0) {
      continue;
    }

    // One haul + assignment per vehicle for the day.
    await prisma.haul.createMany({
      data: vehicles.map((v) => ({
        transactionDayId: day.id,
        vehicleId: v.id,
        operationDate: opDate,
        status: dayStatus,
      })),
    });
    const hauls = await prisma.haul.findMany({
      where: { operationDate: opDate },
      select: { id: true, vehicleId: true },
    });
    const haulIdByVehicle = new Map(hauls.map((h) => [h.vehicleId, h.id]));
    await prisma.haulAssignment.createMany({
      data: hauls.map((h, i) => ({
        haulId: h.id,
        driverId: driverIds[i % driverIds.length]!,
        operationDate: opDate,
        status: dayStatus,
      })),
    });
    const assignments = await prisma.haulAssignment.findMany({
      where: { operationDate: opDate },
      select: { id: true, haulId: true },
    });
    const assignmentIdByHaul = new Map(assignments.map((a) => [a.haulId, a.id]));

    const trips: Prisma.TripCreateManyInput[] = [];
    const tpaRows: Array<{ plate: string; net: number; tare: number; assignmentId: string }> = [];

    for (let vi = 0; vi < vehicles.length; vi += 1) {
      const v = vehicles[vi];
      if (!v) continue;
      const haulId = haulIdByVehicle.get(v.id);
      if (haulId === undefined) continue;
      const assignmentId = assignmentIdByHaul.get(haulId);
      if (assignmentId === undefined) continue;

      // Rotate the disposal route per (vehicle, day) for route-activity spread.
      const disposalRouteId = disposalRouteIds[(vi + offset) % disposalRouteIds.length]!;
      const tripCount = 3 + Math.floor(rng() * 5); // 3..7
      let vehicleNet = 0;
      for (let i = 0; i < tripCount; i += 1) {
        const netWeight = 2000 + Math.floor(rng() * 6000); // 2..8 ton
        vehicleNet += netWeight;
        // Operational target-vs-realisasi (KM + time) for the Pengangkutan view.
        // Derived deterministically from (offset, vi, i) — NO rng() calls — so the
        // existing tuned tonnage/fuel/reconciliation distributions stay identical.
        const targetTime = new Date(opDate);
        targetTime.setUTCHours(6 + (i % 10), (vi * 7) % 60, 0, 0);
        const actualTime = new Date(targetTime.getTime() + (((offset + i + vi) % 25) - 5) * 60_000);
        const targetOdometer = 100_000 + (SYNTHETIC_DAYS - offset) * 45 + i * 14 + vi * 3;
        const actualOdometer = targetOdometer + ((vi + i) % 9);
        trips.push({
          haulAssignmentId: assignmentId,
          routeId: disposalRouteId,
          operationDate: opDate,
          status,
          name: `Pembuangan #${i + 1}`,
          tareWeight: v.tareWeight,
          grossWeight: v.tareWeight + netWeight,
          netWeight,
          wasteVolume: 6 + Math.floor(rng() * 6),
          targetTime,
          actualTime,
          targetOdometer,
          actualOdometer,
        });
      }

      // Refuel leg (every other vehicle-day) — vehicles where vi % 3 === 0 are
      // chronically under-approved (~−12%, RED in BBM variance); the rest stay
      // mostly OK (10% short every 5th day, within the −5% threshold).
      if ((vi + offset) % 2 === 0 && refuelRouteIds.length > 0) {
        const requested = 40 + Math.floor(rng() * 21); // 40..60 L
        const approved =
          vi % 3 === 0
            ? Math.round(requested * 0.88)
            : offset % 5 === 0
              ? Math.round(requested * 0.9)
              : requested;
        trips.push({
          haulAssignmentId: assignmentId,
          routeId: refuelRouteIds[vi % refuelRouteIds.length]!,
          operationDate: opDate,
          status,
          name: 'Pengisian BBM',
          fuelRequestedLiters: requested,
          fuelApprovedLiters: approved,
        });
      }

      tpaRows.push({ plate: v.plateNumber, net: vehicleNet, tare: v.tareWeight, assignmentId });
    }

    await prisma.trip.createMany({ data: trips });

    // Resolve one representative disposal trip per assignment so the weighbridge
    // log can carry a `trip_id` + `cctv_reference` (the recap grid's "CCTV TPA"
    // modal reads cctv via this link — see TransactionDaysService.withCctv).
    const disposalTrips = await prisma.trip.findMany({
      where: { operationDate: opDate, routeId: { in: disposalRouteIds } },
      select: { id: true, haulAssignmentId: true },
      orderBy: { name: 'asc' },
    });
    const tripByAssignment = new Map<string, string>();
    for (const t of disposalTrips) {
      if (!tripByAssignment.has(t.haulAssignmentId)) {
        tripByAssignment.set(t.haulAssignmentId, t.id);
      }
    }

    // TPA weighbridge logs (one per vehicle) reconciled against the day's
    // disposal tonnage: every 12th day PENDING (no rows), the next DISCREPANCY
    // (−20%), the rest MATCHED (±2%). operation_date is the partition key (not
    // on the Prisma model) → raw multi-row insert; `updated_at` has no DB default.
    const bucket = offset % 12;
    if (bucket !== 0) {
      const factor = bucket === 1 ? 0.8 : 0.98 + rng() * 0.04;
      const values = tpaRows
        .filter((r) => r.net > 0)
        .map((r) => {
          const net = Math.round(r.net * factor);
          // A deterministic demo capture image per (vehicle, day) so the CCTV TPA
          // modal shows a real picture; the cell falls back to this raw reference
          // if the network is offline. trip_id links it to the recap grid row.
          const tripId = tripByAssignment.get(r.assignmentId) ?? null;
          const cctv = `https://picsum.photos/seed/${encodeURIComponent(r.plate)}-${offset}/640/480`;
          return Prisma.sql`(${opDate}::date, ${opDate}::date, ${r.plate}, ${r.tare + net}, ${r.tare}, ${net}, ${cctv}, ${tripId}::uuid, now())`;
        });
      if (values.length > 0) {
        await prisma.$executeRaw`
          INSERT INTO "tpa_inbound_log"
            ("operation_date", "date", "plate_number", "gross_weight", "tare_weight", "net_weight", "cctv_reference", "trip_id", "updated_at")
          VALUES ${Prisma.join(values)}
        `;
      }
    }
  }

  const from = new Date(SYNTHETIC_END);
  from.setUTCDate(SYNTHETIC_END.getUTCDate() - (SYNTHETIC_DAYS - 1));
  return { from, to: SYNTHETIC_END };
}

// ---------------------------------------------------------------------------
// 7. Demo inspections + maintenance + photos (operations CRUD pages)
// ---------------------------------------------------------------------------
const INSPECTION_LABELS = ['Rem', 'Lampu', 'Ban', 'Mesin', 'Bodi'];

async function seedInspections(vehicles: DemoVehicleRef[], adminId: string | null): Promise<void> {
  const rng = makeRng(31415);
  for (let vi = 0; vi < vehicles.length; vi += 1) {
    const v = vehicles[vi];
    if (!v) continue;
    if ((await prisma.vehicleInspection.count({ where: { vehicleId: v.id } })) > 0) {
      continue;
    }
    const count = 2 + (vi % 2); // 2..3
    for (let i = 0; i < count; i += 1) {
      const date = new Date(SYNTHETIC_END);
      date.setUTCMonth(date.getUTCMonth() - (i + 1) * 3);
      const items = INSPECTION_LABELS.map((label) => {
        const r = rng();
        const itemStatus: InspectionItemStatus = r > 0.9 ? 'FAIL' : r > 0.75 ? 'ATTENTION' : 'OK';
        return {
          label,
          status: itemStatus,
          notes: itemStatus === 'OK' ? null : 'Perlu perhatian',
        };
      });
      const failed = items.filter((it) => it.status === 'FAIL').length;
      const attention = items.filter((it) => it.status === 'ATTENTION').length;
      const passed = items.filter((it) => it.status === 'OK').length;
      const result: InspectionResult = failed > 0 ? 'FAIL' : attention > 0 ? 'ATTENTION' : 'PASS';
      await prisma.vehicleInspection.create({
        data: {
          vehicleId: v.id,
          date,
          result,
          passedCount: passed,
          totalCount: items.length,
          inspectorId: adminId,
          createdById: adminId,
          items: { create: items },
        },
      });
    }
  }
}

async function seedMaintenance(vehicles: DemoVehicleRef[], adminId: string | null): Promise<void> {
  for (let vi = 0; vi < vehicles.length; vi += 1) {
    const v = vehicles[vi];
    if (!v) continue;
    if ((await prisma.maintenanceRecord.count({ where: { vehicleId: v.id } })) > 0) {
      continue;
    }
    const count = 2 + (vi % 2); // 2..3
    for (let i = 0; i < count; i += 1) {
      const date = new Date(SYNTHETIC_END);
      date.setUTCMonth(date.getUTCMonth() - (i + 1) * 4);
      const type: MaintenanceType = i % 2 === 0 ? 'SERVICE' : 'REPAIR';
      const recordStatus: MaintenanceStatus = i === 0 ? 'PENDING_APPROVAL' : 'APPROVED';
      const items = [
        { name: 'Oli mesin', qty: 4, unitPrice: 60_000 },
        { name: 'Filter', qty: 1, unitPrice: 120_000 },
      ].map((it) => ({ ...it, totalPrice: it.qty * it.unitPrice }));
      const totalCost = items.reduce((sum, it) => sum + it.totalPrice, 0);
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: v.id,
          type,
          status: recordStatus,
          date,
          odometer: 100_000 + vi * 1_000 + i * 500,
          workshop: 'Bengkel DKP',
          description: type === 'SERVICE' ? 'Servis berkala' : 'Perbaikan',
          totalCost,
          createdById: adminId,
          items: { create: items },
        },
      });
    }
  }
}

/** Placeholder Photo rows (URL/key only, no real upload) attached to a sample of
 * trips, inspections, and maintenance so the photo galleries aren't empty. */
async function seedDemoPhotos(): Promise<void> {
  if ((await prisma.photo.count({ where: { objectKey: { startsWith: 'demo/' } } })) > 0) {
    return;
  }
  const [trips, inspections, maintenance] = await Promise.all([
    prisma.trip.findMany({ take: 10, orderBy: { operationDate: 'desc' }, select: { id: true } }),
    prisma.vehicleInspection.findMany({ take: 10, select: { id: true } }),
    prisma.maintenanceRecord.findMany({ take: 10, select: { id: true } }),
  ]);
  const refs = [
    ...trips.map((t) => ({ ownerType: 'TRIP', ownerId: t.id })),
    ...inspections.map((t) => ({ ownerType: 'VEHICLE_INSPECTION', ownerId: t.id })),
    ...maintenance.map((t) => ({ ownerType: 'MAINTENANCE_RECORD', ownerId: t.id })),
  ];
  if (refs.length === 0) return;
  await prisma.photo.createMany({
    data: refs.map((r, idx) => ({
      objectKey: `demo/${r.ownerType.toLowerCase()}/${r.ownerId}.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: 102_400,
      width: 800,
      height: 600,
      checksum: `demo-${idx}`,
      ownerType: r.ownerType,
      ownerId: r.ownerId,
    })),
  });
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
/**
 * Dev/CI-only demo users — one per non-admin role — so RBAC and permission-gated
 * UI can be exercised without hand-creating accounts. All share the default
 * password and are ready to use (no forced reset). Never seeded in production.
 */
async function seedDemoRoleUsers(roleIdByName: Map<string, string>): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  const passwordHash = await hash(ADMIN_DEFAULT_PASSWORD, ARGON2_OPTIONS);
  const demoUsers: ReadonlyArray<{ username: string; name: string; role: string }> = [
    { username: 'administrasi', name: 'Demo Administrasi Data', role: 'Administrasi Data' },
    { username: 'checker', name: 'Demo Checker', role: 'Checker' },
    { username: 'operator', name: 'Demo Operator Pool', role: 'Operator Pool' },
    { username: 'petugastpa', name: 'Demo Petugas TPA', role: 'Petugas TPA' },
    { username: 'supervisor', name: 'Demo Supervisor', role: 'Supervisor' },
  ];
  for (const demo of demoUsers) {
    const roleId = roleIdByName.get(demo.role);
    if (roleId === undefined) {
      continue;
    }
    await prisma.user.upsert({
      where: { username: demo.username },
      update: { passwordHash, mustChangePassword: false, roleId },
      create: {
        username: demo.username,
        name: demo.name,
        passwordHash,
        roleId,
        mustChangePassword: false,
      },
    });
  }
}

/**
 * Dev/CI-only demo ServiceAccount for the weighbridge integration API. Uses a
 * FIXED dev key (stable across reseeds, upserted by name) so a developer can copy
 * it from the seed log and call `/api/v1/weighbridge/*` immediately. Only the
 * Argon2 hash is stored, mirroring the runtime ServiceAccountService. Never in
 * production. The real cutover issues keys via the admin UI (one-time display).
 */
const DEMO_SERVICE_ACCOUNT_KEY =
  'swatwb_demo_000000000000000000000000000000000000000000000000000000';

async function seedDemoServiceAccount(roleIdByName: Map<string, string>): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  const roleId = roleIdByName.get(SERVICE_ACCOUNT_ROLE);
  if (roleId === undefined) {
    return;
  }
  const apiKeyHash = await hash(DEMO_SERVICE_ACCOUNT_KEY, ARGON2_OPTIONS);
  const apiKeyPrefix = DEMO_SERVICE_ACCOUNT_KEY.slice(0, 12);
  await prisma.serviceAccount.upsert({
    where: { legacyId: -1 }, // sentinel for the demo account; never collides with real ids
    update: { apiKeyHash, apiKeyPrefix, roleId, active: true, revokedAt: null },
    create: {
      legacyId: -1,
      name: 'TPA Jembatan Timbang (Demo)',
      apiKeyHash,
      apiKeyPrefix,
      roleId,
      active: true,
      rateLimitPerMin: 500,
      allowedIPs: [],
    },
  });
  // eslint-disable-next-line no-console
  console.log('Demo service account API key (dev only): ' + DEMO_SERVICE_ACCOUNT_KEY);
}

/** Recompute the monitoring rollups over the seeded range so the dashboards work
 * straight after `seed:demo` with no separate `rollup:backfill` step. */
async function backfillRollups(range: { from: Date; to: Date }): Promise<void> {
  const service = new RollupService(new RollupRepository(prisma as unknown as PrismaService));
  const { days, months } = await service.backfill(range.from, range.to);
  // eslint-disable-next-line no-console
  console.log(`Rollup backfill: ${days} hari + ${months} bulan diperbarui.`);
}

/**
 * Demo GPS devices (Phase 7, T-704). Attaches hardware trackers to a subset of
 * the demo fleet — most online, a couple offline — and leaves the rest
 * intentionally UNTRACKED so the coverage badge + hybrid map exercise all states.
 * Also parks one unknown IMEI in the unmatched-ping queue. Idempotent (upsert by
 * deviceId; the queue row is reset each run). Surabaya-area last positions.
 */
interface DemoTrackedDevice {
  vehicleId: string;
  imei: string;
  lat: number;
  lng: number;
}

async function seedDemoGpsDevices(
  vehicles: ReadonlyArray<{ id: string }>,
): Promise<DemoTrackedDevice[]> {
  const SURABAYA = { lat: -7.2575, lng: 112.7521 };
  // First 10 of 15 get a tracker; indices 8–9 are offline; the last 5 stay untracked.
  const TRACKED = 10;
  const OFFLINE_FROM = 8;
  const now = new Date();
  const staleAt = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago → offline

  let online = 0;
  let offline = 0;
  const onlineDevices: DemoTrackedDevice[] = [];
  for (let i = 0; i < Math.min(TRACKED, vehicles.length); i += 1) {
    const vehicle = vehicles[i];
    if (!vehicle) continue;
    const isOffline = i >= OFFLINE_FROM;
    const imei = `35000000000${String(i).padStart(4, '0')}`;
    const lat = SURABAYA.lat + i * 0.004;
    const lng = SURABAYA.lng + i * 0.004;
    const data = {
      deviceType: 'gps-hardware',
      imei,
      provider: 'gpsid',
      priority: 0,
      active: true,
      status: isOffline ? 'offline' : 'online',
      lastPingAt: isOffline ? staleAt : now,
      lastLat: lat,
      lastLng: lng,
      lastSpeedKmh: isOffline ? 0 : 18 + i,
      lastHeading: (i * 30) % 360,
    };
    await prisma.gpsDevice.upsert({
      where: { deviceId: imei },
      update: { ...data, vehicleId: vehicle.id },
      create: { ...data, deviceId: imei, vehicleId: vehicle.id },
    });
    if (isOffline) {
      offline += 1;
    } else {
      online += 1;
      onlineDevices.push({ vehicleId: vehicle.id, imei, lat, lng });
    }
  }

  // One unknown IMEI parked in the queue (reset each run for idempotency).
  const UNKNOWN_IMEI = '359999999999999';
  await prisma.gpsUnmatchedPing.deleteMany({ where: { imei: UNKNOWN_IMEI } });
  await prisma.gpsUnmatchedPing.createMany({
    data: [
      {
        imei: UNKNOWN_IMEI,
        payload: { Lat: SURABAYA.lat, Lon: SURABAYA.lng, VehicleNumber: 'L 9999 ZZ' },
      },
      {
        imei: UNKNOWN_IMEI,
        payload: { Lat: SURABAYA.lat, Lon: SURABAYA.lng, VehicleNumber: 'L 9999 ZZ' },
      },
    ],
  });

  const untracked = Math.max(0, vehicles.length - Math.min(TRACKED, vehicles.length));
  // eslint-disable-next-line no-console
  console.log(
    `Demo GPS devices: ${online} online, ${offline} offline, ${untracked} untracked; 1 unmatched IMEI queued.`,
  );
  return onlineDevices;
}

/**
 * Synthetic recent breadcrumb tracks (Phase 7, T-723) — a handful of pings per
 * online device over the last few minutes, so the live map, the breadcrumb
 * endpoint, and the efficiency odometer-delta have real data. Idempotent: clears
 * each device's recent pings first. No MySQL/vendor needed.
 */
async function seedDemoTracks(devices: DemoTrackedDevice[]): Promise<void> {
  if (devices.length === 0) return;
  const now = Date.now();
  const STEPS = 6;
  const imeis = devices.map((d) => d.imei);
  await prisma.gpsPing.deleteMany({
    where: { imei: { in: imeis }, recordedAt: { gte: new Date(now - 60 * 60 * 1000) } },
  });
  const rows = devices.flatMap((d) =>
    Array.from({ length: STEPS }, (_, k) => ({
      vehicleId: d.vehicleId,
      imei: d.imei,
      latitude: d.lat + k * 0.0006,
      longitude: d.lng + k * 0.0006,
      speedKmh: 15 + k,
      heading: 90,
      engineOn: true,
      odometerM: BigInt(1_000_000 + k * 250),
      source: 'gpsid',
      recordedAt: new Date(now - (STEPS - 1 - k) * 30_000), // every 30s, newest last
    })),
  );
  await prisma.gpsPing.createMany({ data: rows, skipDuplicates: true });
  // eslint-disable-next-line no-console
  console.log(`Demo GPS tracks: ${rows.length} pings across ${devices.length} online vehicles.`);
}

/**
 * One demo route corridor (Phase 7, T-723) — a LineString template so the
 * Pengangkutan → Peta corridor overlay + the deviation matcher have geometry to
 * work with. Picks the first route with origin+destination coords. Length is
 * computed by PostGIS; the geography column is generated.
 */
async function seedDemoCorridor(): Promise<void> {
  const route = await prisma.route.findFirst({
    where: {
      deletedAt: null,
      // PICKUP/DISPOSAL legs run between two DISTINCT sites → a real corridor
      // (pool round-trips share origin+destination → zero-length).
      category: { in: ['PICKUP', 'DISPOSAL', 'REFUEL'] },
      originSite: { latitude: { not: null }, longitude: { not: null } },
      destinationSite: { latitude: { not: null }, longitude: { not: null } },
    },
    select: {
      id: true,
      originSite: { select: { latitude: true, longitude: true } },
      destinationSite: { select: { latitude: true, longitude: true } },
    },
  });
  if (!route?.originSite.latitude || !route.destinationSite.latitude) return;
  const o = route.originSite;
  const d = route.destinationSite;
  const pathGeojson = {
    type: 'LineString',
    coordinates: [
      [Number(o.longitude), Number(o.latitude)],
      [Number(d.longitude), Number(d.latitude)],
    ],
  };
  const len = await prisma.$queryRaw<Array<{ len: number }>>`
    SELECT ROUND(ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(pathGeojson)}), 4326)::geography))::int AS "len"
  `;
  await prisma.routeGeometry.upsert({
    where: { routeId: route.id },
    update: { pathGeojson, lengthMeters: len[0]?.len ?? 0 },
    create: {
      routeId: route.id,
      pathGeojson,
      toleranceMeters: 150,
      lengthMeters: len[0]?.len ?? 0,
      source: 'google-maps',
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Demo corridor: 1 route geometry (${len[0]?.len ?? 0} m).`);
}

async function main(): Promise<void> {
  const permissionIdByKey = await seedPermissions();
  const roleIdByName = await seedRoles(permissionIdByKey);

  const adminRoleId = roleIdByName.get('Administrator');
  if (adminRoleId === undefined) {
    throw new Error('Administrator role was not created');
  }
  await seedAdminUser(adminRoleId);
  // Operational config (always seeded, like permissions/roles): Phase 7 default
  // deviation rules so the matcher + rule-tuning API have a baseline.
  await seedDeviationRules();

  // Legacy-migration target: seed ONLY the auth bootstrap (permissions, roles,
  // admin). All reference + master + transactional data comes from the legacy DB
  // via `migrate:legacy`; seeding reference rows here would collide with the
  // migrated ones on unique business keys (e.g. waste-source `code`).
  const authOnly = process.env.SEED_AUTH_ONLY === 'true';
  if (authOnly) {
    // eslint-disable-next-line no-console
    console.log(
      'SEED_AUTH_ONLY: seeded permissions + roles + admin only (master data via migrate:legacy).',
    );
  } else {
    await seedDemoRoleUsers(roleIdByName);
    await seedDemoServiceAccount(roleIdByName);
    await seedReferenceData();
    if (process.env.SEED_SYNTHETIC !== 'false') {
      await seedLevies();
      const admin = await prisma.user.findUnique({
        where: { username: 'admin' },
        select: { id: true },
      });
      const adminId = admin?.id ?? null;

      const fleet = await loadDemoFleet();
      const trackedDevices = await seedDemoGpsDevices(fleet.vehicles);
      await seedDemoTracks(trackedDevices);
      await seedDemoCorridor();
      // Populate today's efficiency rollup so the dashboard isn't empty pre-cron.
      const effRows = await new GpsEfficiencyService(
        new GpsEfficiencyRepository(prisma as unknown as PrismaService),
      ).refreshForDate(new Date());
      // eslint-disable-next-line no-console
      console.log(`Demo efficiency rollup: ${effRows} vehicle rows for today.`);
      await linkDemoWasteSources(fleet.vehicles);
      await seedDemoPermits(fleet.vehicles, adminId);
      const range = await seedDemoTransactions(fleet);
      await seedInspections(fleet.vehicles, adminId);
      await seedMaintenance(fleet.vehicles, adminId);
      await seedDemoPhotos();
      if (range) {
        await backfillRollups(range);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Admin login: admin / ' + ADMIN_DEFAULT_PASSWORD);
  if (process.env.NODE_ENV !== 'production' && !authOnly) {
    // eslint-disable-next-line no-console
    console.log('Forced-reset demo: adminreset / ' + ADMIN_DEFAULT_PASSWORD);
    // eslint-disable-next-line no-console
    console.log(
      'Role demo users (password ' +
        ADMIN_DEFAULT_PASSWORD +
        '): administrasi, checker, operator, petugastpa, supervisor',
    );
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
