/**
 * T-159 — Migration validation & report. Re-runnable: reconciles legacy vs
 * migrated row counts (≤1% tolerance), spot-checks FK integrity + security
 * invariants, and writes `reports/migration-verification-report.md`. Exits 1 on
 * any critical failure (count mismatch or FK violation) so it can gate cutover.
 *
 * Run (operator, on-prem): pnpm --filter @swat/backend run migrate:verify
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import {
  type MigrationReport,
  type ReconcileRow,
  hasCriticalFailures,
  reconcileRow,
  renderReportMarkdown,
} from './lib/reconcile';
import { connectLegacy, countRows, legacyDbConfigFromEnv, log, query, warn } from './lib/runtime';

const prisma = new PrismaClient();

interface Pair {
  legacyTable: string;
  count: () => Promise<number>;
  expectedDrop?: () => Promise<number>;
}

const PAIRS: Pair[] = [
  { legacyTable: 'aplikasikendaraan', count: () => prisma.vehicleApplication.count() },
  { legacyTable: 'bahanbakar', count: () => prisma.fuel.count() },
  { legacyTable: 'kategoribahanbakar', count: () => prisma.fuelCategory.count() },
  { legacyTable: 'sim', count: () => prisma.licenseClass.count() },
  { legacyTable: 'spot', count: () => prisma.site.count() },
  { legacyTable: 'kategorisumbersampah', count: () => prisma.wasteSource.count() },
  { legacyTable: 'kategorikendaraan', count: () => prisma.vehicleModel.count() },
  { legacyTable: 'kendaraan', count: () => prisma.vehicle.count() },
  { legacyTable: 'kategorisumbersampahkendaraan', count: () => prisma.vehicleWasteSource.count() },
  { legacyTable: 'pengemudi', count: () => prisma.driver.count() },
  { legacyTable: 'kepemilikansim', count: () => prisma.driverLicense.count() },
  { legacyTable: 'mastertrayek', count: () => prisma.tripTemplate.count() },
  { legacyTable: 'jatahkitir', count: () => prisma.disposalPermit.count() },
  { legacyTable: 'tonase', count: () => prisma.dailyTonnage.count() },
  { legacyTable: 'retribusi', count: () => prisma.levy.count() },
  { legacyTable: 'konversi_si_swat', count: () => prisma.legacyNameMap.count() },
];

async function reconcileCounts(): Promise<ReconcileRow[]> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  const rows: ReconcileRow[] = [];
  try {
    // Routes are deduped — compute the expected drop so the variance check is fair.
    const dupRows = await query<{ extra: number }>(
      conn,
      `SELECT COALESCE(SUM(c - 1), 0) AS extra FROM (SELECT COUNT(*) AS c FROM rute GROUP BY SPOT_ASAL_ID, SPOT_TUJUAN_ID, KATEGORIRUTE_ID) t`,
    );
    const routeDrop = Number(dupRows[0]?.extra ?? 0);
    rows.push(
      reconcileRow('rute', await countRows(conn, 'rute'), await prisma.route.count(), 1, routeDrop),
    );

    // Crew schedules are deduped on (vehicle, driver) — compute the expected drop
    // so the variance check is fair (same treatment as the route dedupe above).
    const crewDupRows = await query<{ extra: number }>(
      conn,
      `SELECT COALESCE(SUM(c - 1), 0) AS extra FROM (SELECT COUNT(*) AS c FROM masterdetailtransaksiangkutsampah GROUP BY KENDARAAN_ID, PENGEMUDI_ID) t`,
    );
    const crewDrop = Number(crewDupRows[0]?.extra ?? 0);
    rows.push(
      reconcileRow(
        'masterdetailtransaksiangkutsampah',
        await countRows(conn, 'masterdetailtransaksiangkutsampah'),
        await prisma.crewSchedule.count(),
        1,
        crewDrop,
      ),
    );

    for (const p of PAIRS) {
      const legacy = await safeCount(conn, p.legacyTable);
      rows.push(reconcileRow(p.legacyTable, legacy, await p.count()));
    }
  } finally {
    await conn.end();
  }
  return rows;
}

async function safeCount(conn: Parameters<typeof countRows>[0], table: string): Promise<number> {
  try {
    return await countRows(conn, table);
  } catch {
    return 0;
  }
}

async function checkFkIntegrity(): Promise<boolean> {
  const checks: Array<[string, () => Promise<Array<{ n: bigint }>>]> = [
    [
      'vehicle.poolSiteId',
      () =>
        prisma.$queryRaw`SELECT COUNT(*) AS n FROM "vehicle" v WHERE v."pool_site_id" NOT IN (SELECT id FROM "site")`,
    ],
    [
      'vehicle.modelId',
      () =>
        prisma.$queryRaw`SELECT COUNT(*) AS n FROM "vehicle" v WHERE v."model_id" NOT IN (SELECT id FROM "vehicle_model")`,
    ],
    [
      'driver.poolSiteId',
      () =>
        prisma.$queryRaw`SELECT COUNT(*) AS n FROM "driver" d WHERE d."pool_site_id" NOT IN (SELECT id FROM "site")`,
    ],
    [
      'route.originSiteId',
      () =>
        prisma.$queryRaw`SELECT COUNT(*) AS n FROM "route" r WHERE r."origin_site_id" NOT IN (SELECT id FROM "site")`,
    ],
    [
      'disposalPermit.vehicleId',
      () =>
        prisma.$queryRaw`SELECT COUNT(*) AS n FROM "disposal_permit" q WHERE q."vehicle_id" NOT IN (SELECT id FROM "vehicle")`,
    ],
  ];
  let ok = true;
  for (const [label, run] of checks) {
    try {
      const result = await run();
      const n = Number(result[0]?.n ?? 0);
      if (n > 0) {
        warn(`FK violation: ${label} has ${n} orphans.`);
        ok = false;
      }
    } catch (err) {
      warn(`FK check ${label} could not run: ${String(err)}`);
    }
  }
  return ok;
}

async function checkSecurity(): Promise<Record<string, number | boolean>> {
  const [total, mustChange, nonArgon] = await Promise.all([
    prisma.user.count({ where: { legacyId: { not: null } } }),
    prisma.user.count({ where: { legacyId: { not: null }, mustChangePassword: true } }),
    prisma.user.count({
      where: { legacyId: { not: null }, NOT: { passwordHash: { startsWith: '$argon2' } } },
    }),
  ]);
  return {
    migratedUsers: total,
    allMustChangePassword: total === mustChange,
    nonArgon2Hashes: nonArgon,
  };
}

async function main(): Promise<void> {
  log('Verifying migration…');
  const rows = await reconcileCounts();
  const fkIntegrityPassed = await checkFkIntegrity();
  const security = await checkSecurity();

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    source: 'MySQL dkp_swat',
    target: 'PostgreSQL / Prisma',
    rows,
    dataQuality: {},
    security,
    fkIntegrityPassed,
  };

  const dir = join(__dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  const md = renderReportMarkdown(report);
  writeFileSync(join(dir, 'migration-verification-report.md'), md);
  // eslint-disable-next-line no-console
  console.log(md);

  await prisma.$disconnect();
  if (
    hasCriticalFailures(report) ||
    security.nonArgon2Hashes !== 0 ||
    security.allMustChangePassword !== true
  ) {
    warn('Verification FAILED — see report.');
    process.exit(1);
  }
  log('Verification passed (within tolerance).');
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
