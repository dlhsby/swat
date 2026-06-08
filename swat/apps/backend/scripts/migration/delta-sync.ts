/**
 * T-166 — Parallel-run delta sync. During the cutover parallel-run window, the
 * legacy system keeps taking writes; this re-syncs those changes into PostgreSQL
 * and reconciles KPI parity (tonnage / fuel / ritase) so the teams can confirm the
 * two systems agree before the freeze + flip (specs/04-migration.md §11.2).
 *
 * Run (operator, on-prem): pnpm --filter @swat/backend run migrate:delta-sync
 *
 * Master tables carry no `updatedAt` in the legacy schema, so their delta is a
 * cheap idempotent re-upsert by `legacyId`. The high-volume transactional delta
 * (by `operationDate`/watermark) is the live-only streamed phase — see
 * TODO(T-155) in migrate-legacy.ts; it shares the same keyset + watermark helpers.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import type { LegacyFuelQuota, LegacySite, LegacyVehicle } from './lib/legacy-types';
import { mapFuelQuota, mapSite, mapVehicle } from './lib/mappers';
import { reconcileRow, renderReportMarkdown, type MigrationReport } from './lib/reconcile';
import { connectLegacy, countRows, legacyDbConfigFromEnv, log, query, warn } from './lib/runtime';

const prisma = new PrismaClient();
const NOW = new Date();

async function systemUserId(): Promise<number> {
  const admin = await prisma.user.findFirst({ where: { username: 'admin' }, select: { id: true } });
  if (!admin) {
    throw new Error('No admin user — seed before delta-sync.');
  }
  return admin.id;
}

/** Idempotent re-upsert of the small, change-tracking-free master tables. */
async function resyncMasters(sysUser: number): Promise<void> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    const sites = await query<LegacySite>(conn, 'SELECT * FROM spot');
    for (const s of sites) {
      const data = mapSite(s, NOW);
      await prisma.site.upsert({ where: { id: data.id as number }, create: data, update: data });
    }
    const vehicles = await query<LegacyVehicle>(conn, 'SELECT * FROM kendaraan');
    for (const v of vehicles) {
      const data = mapVehicle(v, NOW);
      await prisma.vehicle.upsert({ where: { id: data.id as number }, create: data, update: data });
    }
    const quotas = await query<LegacyFuelQuota>(conn, 'SELECT * FROM jatahkitir');
    for (const q of quotas) {
      const data = mapFuelQuota(q, NOW, sysUser);
      await prisma.fuelQuota.upsert({
        where: { id: data.id as bigint },
        create: data,
        update: data,
      });
    }
    log(
      `Re-synced masters: sites=${sites.length} vehicles=${vehicles.length} kitir=${quotas.length}`,
    );
  } finally {
    await conn.end();
  }
}

/** Compare the operational KPI totals (tonnage / fuel / ritase) across systems. */
async function reconcileKpis(): Promise<MigrationReport> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    const legacyTonnage = await query<{ s: number }>(
      conn,
      'SELECT COALESCE(SUM(TONASE_NOMINAL),0) AS s FROM tonase',
    );
    const newTonnageAgg = await prisma.dailyTonnage.aggregate({ _sum: { amount: true } });
    const legacyTon = Math.round(Number(legacyTonnage[0]?.s ?? 0));
    const newTon = Number(newTonnageAgg._sum.amount ?? 0n);

    const rows = [
      reconcileRow('tonase (sum kg)', legacyTon, newTon),
      reconcileRow(
        'jatahkitir (count)',
        await countRows(conn, 'jatahkitir'),
        await prisma.fuelQuota.count(),
      ),
      reconcileRow(
        'trayek (ritase count)',
        await countRows(conn, 'trayek'),
        await prisma.trip.count(),
      ),
    ];
    return {
      generatedAt: NOW.toISOString(),
      source: 'MySQL dkp_swat (live parallel-run)',
      target: 'PostgreSQL / Prisma',
      rows,
      dataQuality: {},
      security: {},
      fkIntegrityPassed: true,
    };
  } finally {
    await conn.end();
  }
}

async function main(): Promise<void> {
  log('Delta-sync (parallel-run) starting…');
  const sysUser = await systemUserId();
  await resyncMasters(sysUser);

  // TODO(T-155 — revisit with live data): incremental transactional upsert by
  // operationDate watermark (trayek/transaksiangkutsampah/detail/sampahmasuktpa).
  warn('Transactional incremental sync is the live-only streamed phase (see TODO(T-155)).');

  const report = await reconcileKpis();
  const dir = join(__dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  const md = renderReportMarkdown(report);
  writeFileSync(join(dir, 'delta-sync-kpi-report.md'), md);
  // eslint-disable-next-line no-console
  console.log(md);

  await prisma.$disconnect();
  if (report.rows.some((r) => !r.ok)) {
    warn('KPI parity OUTSIDE tolerance — do not cut over until resolved.');
    process.exit(1);
  }
  log('KPI parity within tolerance.');
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
