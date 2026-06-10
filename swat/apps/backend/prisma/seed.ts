/**
 * Database seed.
 *
 * Populates:
 *  1. Permission catalog (specs/06-auth-rbac.md §2.2).
 *  2. Roles + role→permission grants (specs/06-auth-rbac.md §2.3).
 *  3. Admin user (Argon2id hash; no forced reset) + a dev-only `adminreset`
 *     demo account with mustChangePassword=true.
 *  4. Reference/lookup data (specs/01-glossary.md §4): LicenseClass,
 *     FuelCategory, Fuel, VehicleApplication, WasteSource.
 *  5. Demo levy/retribusi rows (monthly, by category) for the Retribusi dashboard.
 *  6. Synthetic transactional data (a year of disposal + refuel trips, plus TPA
 *     weighbridge logs) so partition pruning and the Phase-2 monitoring
 *     dashboards (tonnage by source, BBM variance, TPA reconciliation) have data;
 *     plus one demo driver-license, crew-schedule, trip-template and two kitir
 *     (DisposalPermit) so the Phase-1 CRUD pages aren't empty.
 *     Items 5–6 are gated by SEED_SYNTHETIC (default true).
 *
 * Idempotent: every write is an upsert or guarded create; re-running is safe and
 * back-fills refuel/TPA onto days an earlier run created (no wipe needed). Run
 * the rollup backfill (`pnpm rollup:backfill`) afterwards to populate the
 * aggregate tables the dashboards read.
 */
import {
  type DayStatus,
  EmploymentStatus,
  PrismaClient,
  RouteCategory,
  SiteType,
  TripStatus,
  VehicleStatus,
} from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

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
// 1. Permission catalog
// ---------------------------------------------------------------------------
const PERMISSION_KEYS: readonly string[] = [
  // User & Auth
  'user:read',
  'user:create',
  'user:update',
  'user:delete',
  'user:manage',
  'role:read',
  'role:create',
  'role:update',
  'role:delete',
  'permission:read',
  'permission:manage',
  // Fleet
  'vehicle:read',
  'vehicle:create',
  'vehicle:update',
  'vehicle:delete',
  'vehicle-model:read',
  'vehicle-model:create',
  'vehicle-model:update',
  'vehicle-model:delete',
  'vehicle-application:read',
  'vehicle-application:create',
  'vehicle-application:update',
  'vehicle-application:delete',
  'fuel:read',
  'fuel:create',
  'fuel:update',
  'fuel:delete',
  'fuel-category:read',
  'fuel-category:create',
  'fuel-category:update',
  'fuel-category:delete',
  // Personnel
  'driver:read',
  'driver:create',
  'driver:update',
  'driver:delete',
  'license:read',
  'license:create',
  'license:update',
  'license:delete',
  // Geography
  'site:read',
  'site:create',
  'site:update',
  'site:delete',
  'route:read',
  'route:create',
  'route:update',
  'route:delete',
  // Waste
  'waste-source:read',
  'waste-source:create',
  'waste-source:update',
  'waste-source:delete',
  // Scheduling
  'crew-schedule:read',
  'crew-schedule:create',
  'crew-schedule:update',
  'crew-schedule:delete',
  'trip-template:read',
  'trip-template:create',
  'trip-template:update',
  'trip-template:delete',
  'disposal-permit:read',
  'disposal-permit:create',
  'disposal-permit:update',
  'disposal-permit:delete',
  // Transactions
  'transaction-day:read',
  'transaction-day:manage',
  'haul:read',
  'haul:create',
  'haul:update',
  'trip:read',
  'trip:create',
  'trip:update',
  'trip:record-pickup',
  'trip:record-disposal',
  'trip:record-fuel',
  'trip:verify',
  // Approve a fuel amount above what was requested.
  'fuel:approve',
  // Edit a trip after it has been verified (locked) — supervisory override.
  'trip:override',
  // Vehicle operations
  'inspection:read',
  'inspection:create',
  'inspection:update',
  'inspection:delete',
  'maintenance:read',
  'maintenance:create',
  'maintenance:update',
  'maintenance:delete',
  'maintenance:approve',
  // Monitoring & Reporting
  'monitoring:read',
  'report:read',
  'report:generate',
  'report:export',
  'levy:read',
  'levy:create',
  'levy:update',
  'levy:delete',
  // Archiving (Phase 2, Epic 2.5) — admin-only partition lifecycle.
  'archive:read',
  'archive:manage',
];

const ACTION_LABELS: Readonly<Record<string, string>> = {
  read: 'view',
  create: 'create',
  update: 'update',
  delete: 'delete',
  manage: 'administer',
  verify: 'verify',
  override: 'override verification for',
  export: 'export',
  generate: 'generate',
  approve: 'approve',
  'record-pickup': 'record pickup for',
  'record-disposal': 'record disposal for',
  'record-fuel': 'record fuel for',
};

function describePermission(key: string): string {
  const [resource, action] = key.split(':');
  const verb = ACTION_LABELS[action ?? ''] ?? action ?? 'access';
  return `Permission to ${verb} ${resource?.replace(/-/g, ' ')}`;
}

/** Expand wildcard patterns (`*:*`, `resource:*`, `*:action`) into concrete keys. */
function expandPatterns(patterns: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const pattern of patterns) {
    const [pResource, pAction] = pattern.split(':');
    for (const key of PERMISSION_KEYS) {
      const [kResource, kAction] = key.split(':');
      const resourceMatch = pResource === '*' || pResource === kResource;
      const actionMatch = pAction === '*' || pAction === kAction;
      if (resourceMatch && actionMatch) {
        expanded.add(key);
      }
    }
  }
  return [...expanded];
}

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
    ],
  },
  { name: 'Checker', patterns: ['vehicle:read', 'driver:read', 'trip:read', 'trip:verify'] },
  {
    name: 'Operator Pool',
    patterns: ['vehicle:read', 'driver:read', 'crew-schedule:read', 'trip:read', 'trip:update'],
  },
  { name: 'Petugas TPA', patterns: ['site:read', 'trip:read', 'trip:record-disposal'] },
  {
    name: 'Supervisor',
    patterns: ['*:read', 'monitoring:read', 'report:read', 'report:export', 'transaction-day:read'],
  },
];

async function seedPermissions(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const key of PERMISSION_KEYS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { description: describePermission(key) },
      create: { key, description: describePermission(key) },
    });
    idByKey.set(key, permission.id);
  }
  return idByKey;
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

  // Primary admin — ready to use, no forced reset. Outside production, re-seeding
  // restores the documented bootstrap credential (admin / Password123!) even if
  // it was changed, keeping local/CI runs repeatable; in production we never
  // clobber a real admin.
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: isProd ? {} : { passwordHash, mustChangePassword: false },
    create: {
      username: 'admin',
      name: 'Administrator',
      passwordHash,
      roleId: adminRoleId,
      mustChangePassword: false,
    },
  });

  // Dev/CI-only demo account for exercising the forced first-login password
  // change (adminreset / Password123!, mustChangePassword=true). Never created
  // in production so it can't become a stray privileged account.
  if (!isProd) {
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

const VEHICLE_APPLICATIONS = ['Compactor', 'Dump Truck', 'Arm Roll', 'Pick Up', 'Tangki'];

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

  for (const fuel of FUELS) {
    const existing = await prisma.fuel.findFirst({ where: { name: fuel.name } });
    if (!existing) {
      await prisma.fuel.create({
        data: {
          name: fuel.name,
          pricePerLiter: fuel.pricePerLiter,
          fuelCategoryId: categoryIdByName.get(fuel.category)!,
        },
      });
    }
  }

  for (const name of VEHICLE_APPLICATIONS) {
    const existing = await prisma.vehicleApplication.findFirst({ where: { name } });
    if (!existing) {
      await prisma.vehicleApplication.create({ data: { name } });
    }
  }

  for (const source of WASTE_SOURCES) {
    await prisma.wasteSource.upsert({
      where: { code: source.code },
      update: { name: source.name },
      create: { code: source.code, name: source.name },
    });
  }
}

// ---------------------------------------------------------------------------
// 5. Levy / retribusi (monthly, by category) — feeds the Retribusi dashboard.
//    Read-only in-app until live legacy levy data lands; this is dev demo data.
// ---------------------------------------------------------------------------
const LEVY_CATEGORIES: ReadonlyArray<{ name: string; baseAmount: number }> = [
  { name: 'Rumah Tangga', baseAmount: 15_000_000 },
  { name: 'Komersial', baseAmount: 28_000_000 },
  { name: 'Industri', baseAmount: 45_000_000 },
  { name: 'Pasar', baseAmount: 12_000_000 },
  { name: 'Hotel & Restoran', baseAmount: 22_000_000 },
];

async function seedLevies(): Promise<void> {
  const rng = makeRng(20260610);
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  // 12 monthly anchors (first-of-month) from 2025-07 to 2026-06.
  for (let m = 0; m < 12; m += 1) {
    const date = dateOnly(2025, 6 + m, 1);
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
// 6. Synthetic transactional data (for partition-pruning verification)
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

async function seedSyntheticData(): Promise<void> {
  const rng = makeRng(20260608);

  // Minimal master chain needed to attach trips.
  const pool = await upsertSiteByName('Pool Pusat', SiteType.POOL);
  const tps = await upsertSiteByName('TPS Demo', SiteType.TPS);
  const tpa = await upsertSiteByName('TPA Demo', SiteType.TPA);

  const application = (await prisma.vehicleApplication.findFirst({
    where: { name: 'Dump Truck' },
  }))!;
  const fuel = (await prisma.fuel.findFirst({ where: { name: 'Solar' } }))!;

  const model =
    (await prisma.vehicleModel.findFirst({ where: { brand: 'Hino Demo' } })) ??
    (await prisma.vehicleModel.create({
      data: {
        brand: 'Hino Demo',
        applicationId: application.id,
        fuelId: fuel.id,
        fuelTankCapacity: 200,
        normalTareWeight: 8000,
        wheelCount: 6,
        normalFuelRatio: 1,
      },
    }));

  const vehicle =
    (await prisma.vehicle.findFirst({ where: { plateNumber: 'L 0001 SW' } })) ??
    (await prisma.vehicle.create({
      data: {
        plateNumber: 'L 0001 SW',
        poolSiteId: pool.id,
        modelId: model.id,
        status: VehicleStatus.GOOD,
        chassisNumber: 'DEMO-CHASSIS-0001',
        engineNumber: 'DEMO-ENGINE-0001',
        currentTareWeight: 8000,
        currentOdometer: 100000,
        registrationExpiry: dateOnly(2027, 0, 1),
        taxExpiry: dateOnly(2027, 0, 1),
      },
    }));

  const vehicle2 =
    (await prisma.vehicle.findFirst({ where: { plateNumber: 'L 0002 SW' } })) ??
    (await prisma.vehicle.create({
      data: {
        plateNumber: 'L 0002 SW',
        poolSiteId: pool.id,
        modelId: model.id,
        status: VehicleStatus.GOOD,
        chassisNumber: 'DEMO-CHASSIS-0002',
        engineNumber: 'DEMO-ENGINE-0002',
        currentTareWeight: 8000,
        currentOdometer: 90000,
        registrationExpiry: dateOnly(2027, 0, 1),
        taxExpiry: dateOnly(2027, 0, 1),
      },
    }));

  // Link each demo vehicle to a waste source so the monitoring by-source
  // breakdown and the Semua / Non-Swasta / Swasta toggle have data in dev:
  // vehicle 1 → Dinas (non-Swasta), vehicle 2 → Swasta. Idempotent on the pair.
  const dinas = (await prisma.wasteSource.findUnique({ where: { code: 'D' } }))!;
  const swasta = (await prisma.wasteSource.findUnique({ where: { code: 'S' } }))!;
  for (const [linkVehicle, source] of [
    [vehicle, dinas],
    [vehicle2, swasta],
  ] as const) {
    await prisma.vehicleWasteSource.upsert({
      where: { vehicleId_wasteSourceId: { vehicleId: linkVehicle.id, wasteSourceId: source.id } },
      update: {},
      create: { vehicleId: linkVehicle.id, wasteSourceId: source.id },
    });
  }

  const driver =
    (await prisma.driver.findFirst({ where: { idCardNumber: '3500000000000001' } })) ??
    (await prisma.driver.create({
      data: {
        name: 'Pengemudi Demo',
        poolSiteId: pool.id,
        employmentStatus: EmploymentStatus.SATGAS,
        idCardNumber: '3500000000000001',
        originAddress: 'Surabaya',
        currentAddress: 'Surabaya',
        birthDate: dateOnly(1990, 0, 1),
        contact: '0800000000',
      },
    }));

  const disposalRoute =
    (await prisma.route.findFirst({
      where: { originSiteId: tps.id, destinationSiteId: tpa.id, category: RouteCategory.DISPOSAL },
    })) ??
    (await prisma.route.create({
      data: {
        category: RouteCategory.DISPOSAL,
        originSiteId: tps.id,
        destinationSiteId: tpa.id,
        distanceKm: 25,
      },
    }));

  // REFUEL route (pool → pool) so the BBM dashboard + DailyFuelByVehicle rollup
  // have data in dev — one refuel leg per operational day.
  const refuelRoute =
    (await prisma.route.findFirst({
      where: { originSiteId: pool.id, destinationSiteId: pool.id, category: RouteCategory.REFUEL },
    })) ??
    (await prisma.route.create({
      data: {
        category: RouteCategory.REFUEL,
        originSiteId: pool.id,
        destinationSiteId: pool.id,
        distanceKm: 5,
      },
    }));

  // --- Demo scheduling + permit rows so the Phase-1 CRUD pages (driver license,
  // crew schedule, trip template, Jatah Kitir) have data in dev, not empty lists.
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
    select: { id: true },
  });
  const truckLicense = (await prisma.licenseClass.findFirst({ where: { name: 'BII Umum' } }))!;
  if (!(await prisma.driverLicense.findFirst({ where: { driverId: driver.id } }))) {
    await prisma.driverLicense.create({
      data: {
        driverId: driver.id,
        licenseClassId: truckLicense.id,
        licenseNumber: 'SIMDEMO00001',
        expiry: dateOnly(2027, 11, 31),
      },
    });
  }

  const timeOfDay = (h: number, m: number): Date => new Date(Date.UTC(1970, 0, 1, h, m));
  const crewSchedule =
    (await prisma.crewSchedule.findFirst({
      where: { vehicleId: vehicle.id, driverId: driver.id },
    })) ??
    (await prisma.crewSchedule.create({
      data: {
        vehicleId: vehicle.id,
        driverId: driver.id,
        departTime: timeOfDay(5, 0),
        returnTime: timeOfDay(14, 0),
      },
    }));

  if (
    !(await prisma.tripTemplate.findFirst({
      where: { crewScheduleId: crewSchedule.id, routeId: disposalRoute.id },
    }))
  ) {
    await prisma.tripTemplate.create({
      data: {
        crewScheduleId: crewSchedule.id,
        routeId: disposalRoute.id,
        targetTime: timeOfDay(6, 0),
        fuelRequestedLiters: 50,
      },
    });
  }

  // Two kitir: an ACTIVE permit for vehicle 1 and an INACTIVE (expired) one for
  // vehicle 2, so the Jatah Kitir list exercises both status pills.
  const demoPermits = [
    {
      code: 'KITIR-DEMO-01',
      vehicleId: vehicle.id,
      status: 'ACTIVE' as const,
      from: dateOnly(2026, 0, 1),
      to: dateOnly(2026, 11, 31),
    },
    {
      code: 'KITIR-DEMO-02',
      vehicleId: vehicle2.id,
      status: 'INACTIVE' as const,
      from: dateOnly(2025, 0, 1),
      to: dateOnly(2025, 11, 31),
    },
  ];
  for (const permit of demoPermits) {
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
        createdById: admin?.id ?? null,
      },
    });
  }

  // One year of operational days ending 2026-06-08 (the project "today").
  const totalDays = 365;
  const end = dateOnly(2026, 5, 8);
  const dayStatus: DayStatus = 'DONE';

  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const opDate = new Date(end);
    opDate.setUTCDate(end.getUTCDate() - offset);

    // Find-or-create the day skeleton (day → haul → assignment) so this pass also
    // enriches days seeded by an earlier run (adds refuel + TPA without a wipe).
    // Alternate the vehicle per day so tonnage splits across Dinas vs Swasta.
    const dayVehicle = offset % 2 === 0 ? vehicle : vehicle2;
    const day =
      (await prisma.transactionDay.findUnique({ where: { date: opDate } })) ??
      (await prisma.transactionDay.create({ data: { date: opDate, status: dayStatus } }));
    const haul =
      (await prisma.haul.findFirst({
        where: { operationDate: opDate, vehicleId: dayVehicle.id },
      })) ??
      (await prisma.haul.create({
        data: {
          transactionDayId: day.id,
          vehicleId: dayVehicle.id,
          operationDate: opDate,
          status: dayStatus,
        },
      }));
    const assignment =
      (await prisma.haulAssignment.findFirst({
        where: { operationDate: opDate, haulId: haul.id },
      })) ??
      (await prisma.haulAssignment.create({
        data: { haulId: haul.id, driverId: driver.id, operationDate: opDate, status: dayStatus },
      }));

    // Disposal trips — only when the day has none yet (preserves an earlier seed).
    const disposalCount = await prisma.trip.count({
      where: { operationDate: opDate, routeId: disposalRoute.id },
    });
    if (disposalCount === 0) {
      const tripCount = 10 + Math.floor(rng() * 11); // 10..20
      const trips = Array.from({ length: tripCount }, (_, i) => {
        const netWeight = 2000 + Math.floor(rng() * 6000); // 2..8 ton
        const tareWeight = 8000;
        return {
          haulAssignmentId: assignment.id,
          routeId: disposalRoute.id,
          operationDate: opDate,
          status: TripStatus.DONE,
          name: `Pembuangan #${i + 1}`,
          tareWeight,
          grossWeight: tareWeight + netWeight,
          netWeight,
          wasteVolume: 6 + Math.floor(rng() * 6),
        };
      });
      await prisma.trip.createMany({ data: trips });
    }

    // Refuel trip — one per day. Approved falls 10% short on every 5th day so the
    // BBM variance view (red when approved < requested − 5%) has signal.
    const refuelExists = await prisma.trip.findFirst({
      where: { operationDate: opDate, routeId: refuelRoute.id },
      select: { id: true },
    });
    if (!refuelExists) {
      const requested = 40 + Math.floor(rng() * 21); // 40..60 L
      // vehicle2 (Swasta) is chronically under-approved (~−12%) so the BBM
      // variance view shows a RED vehicle; vehicle1 stays mostly OK (10% short
      // every 5th day, averaging within the −5% threshold).
      const approved =
        dayVehicle.id === vehicle2.id
          ? Math.round(requested * 0.88)
          : offset % 5 === 0
            ? Math.round(requested * 0.9)
            : requested;
      await prisma.trip.create({
        data: {
          haulAssignmentId: assignment.id,
          routeId: refuelRoute.id,
          operationDate: opDate,
          status: TripStatus.DONE,
          name: 'Pengisian BBM',
          fuelRequestedLiters: requested,
          fuelApprovedLiters: approved,
        },
      });
    }

    // TPA weighbridge log — reconciled against the day's disposal tonnage:
    // every 12th day PENDING (no row), the next DISCREPANCY (−20%), the rest
    // MATCHED (±2%). operation_date is the partition key (not on the Prisma model),
    // so insert via raw SQL with operation_date = date. `id` is supplied by the
    // table's gen_random_uuid() default (see the partition migration).
    const alreadyLogged = await prisma.tpaInboundLog.count({ where: { date: opDate } });
    if (alreadyLogged === 0) {
      const bucket = offset % 12;
      if (bucket !== 0) {
        const dayNet =
          (
            await prisma.trip.aggregate({
              _sum: { netWeight: true },
              where: { operationDate: opDate, routeId: disposalRoute.id },
            })
          )._sum.netWeight ?? 0;
        const factor = bucket === 1 ? 0.8 : 0.98 + rng() * 0.04;
        const tpaNet = Math.round(dayNet * factor);
        const tareWeight = 8000;
        // `updatedAt` is app-managed (@updatedAt) with no DB default, so a raw
        // insert must set it explicitly alongside the partition key.
        await prisma.$executeRaw`
          INSERT INTO "tpa_inbound_log"
            ("operation_date", "date", "plate_number", "gross_weight", "tare_weight", "net_weight", "updated_at")
          VALUES
            (${opDate}::date, ${opDate}::date, ${dayVehicle.plateNumber},
             ${tareWeight + tpaNet}, ${tareWeight}, ${tpaNet}, now())
        `;
      }
    }
  }
}

async function upsertSiteByName(name: string, type: SiteType): Promise<{ id: string }> {
  const existing = await prisma.site.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.site.create({ data: { name, type, address: name } });
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

async function main(): Promise<void> {
  const permissionIdByKey = await seedPermissions();
  const roleIdByName = await seedRoles(permissionIdByKey);

  const adminRoleId = roleIdByName.get('Administrator');
  if (adminRoleId === undefined) {
    throw new Error('Administrator role was not created');
  }
  await seedAdminUser(adminRoleId);
  await seedDemoRoleUsers(roleIdByName);

  // Legacy-migration target: seed ONLY the auth bootstrap (permissions, roles,
  // admin). All reference + master + transactional data comes from the legacy DB
  // via `migrate:legacy`; seeding reference rows here would collide with the
  // migrated ones on unique business keys (e.g. waste-source `code`) and force
  // `createMany({skipDuplicates})` to drop the legacy rows.
  const authOnly = process.env.SEED_AUTH_ONLY === 'true';
  if (authOnly) {
    // eslint-disable-next-line no-console
    console.log(
      'SEED_AUTH_ONLY: seeded permissions + roles + admin only (master data via migrate:legacy).',
    );
  } else {
    await seedReferenceData();
    if (process.env.SEED_SYNTHETIC !== 'false') {
      await seedLevies();
      await seedSyntheticData();
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Admin login: admin / ' + ADMIN_DEFAULT_PASSWORD);
  if (process.env.NODE_ENV !== 'production') {
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
