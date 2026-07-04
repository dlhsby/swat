/**
 * GPS.id ↔ SWAT coverage report (Phase 7 / B4 helper).
 *
 * Pulls the live GPS.id vehicle roster and intersects it with the SWAT `vehicle`
 * table BY EXTRACTED PLATE (the same `extractPlate` the sync uses — so a GPS.id
 * type-name "ARMROLL 14M3-B 9552 EQ" and a legacy plate "B9552EQ#43" both reduce to
 * "B9552EQ"). Use it to pick REAL legacy vehicles to bake into the demo fixtures so
 * the demo has vehicles GPS.id can actually sync + track.
 *
 * Run AFTER seeding the masters you want to intersect against — for the full fleet
 * load the legacy/staging masters first (`pnpm db:seed:legacy` / staging seed);
 * against the plain demo seed you only see the 15 demo vehicles.
 *
 * Requires GPS.id credentials (GPSID_BASE_URL/USERNAME/PASSWORD) + DATABASE_URL in
 * the environment (loaded from the local .env files, same as the app).
 *
 *   pnpm --filter @swat/backend run gpsid:coverage
 *   pnpm --filter @swat/backend run gpsid:coverage -- --all          # list every row
 *   pnpm --filter @swat/backend run gpsid:coverage -- --json=out.json # write full result
 *
 * Output groups the roster into:
 *   - matched & already in demo   (nothing to do)
 *   - matched but NOT in demo      ← the candidates to add to demo-fixtures.ts
 *   - unmatched (no SWAT vehicle)  (plate typo, or vehicle not in this DB)
 */
import { writeFileSync } from 'node:fs';

import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';

import { DEMO_VEHICLES } from '../prisma/demo-fixtures';
import { loadScriptEnv } from '../src/common/prisma/load-script-env';
import { pgAdapter } from '../src/common/prisma/pg-adapter';
import { AppConfigModule } from '../src/config';
import { CacheModule } from '../src/modules/cache/cache.module';
import { extractPlate } from '../src/modules/integrations/gps/gps-vehicle-sync.service';
import { GpsidClientService } from '../src/modules/integrations/gps/gpsid-client.service';

/** Minimal context: reuse the tested GPS.id client (auth + rate limit + parsing). */
@Module({ imports: [AppConfigModule, CacheModule], providers: [GpsidClientService] })
class CoverageModule {}

interface Row {
  imei: string;
  raw: string;
  plate: string;
  swatPlate?: string;
  vehicleId?: string;
  inDemo?: boolean;
}

const argv = process.argv.slice(2);
const showAll = argv.includes('--all');
const jsonPath = argv.find((a) => a.startsWith('--json='))?.split('=').slice(1).join('=');
const PREVIEW = 40;

function printRows(title: string, rows: Row[], limit: number): void {
  if (rows.length === 0) return;
  console.log(`\n${title} (${rows.length})`);
  for (const r of rows.slice(0, limit)) {
    const target = r.swatPlate ? `→ ${r.swatPlate}` : '';
    console.log(`  ${r.plate.padEnd(10)} ${r.imei.padEnd(18)} ${target.padEnd(14)} ${r.raw}`);
  }
  if (rows.length > limit) {
    console.log(`  … ${rows.length - limit} more (use --all or --json to see them)`);
  }
}

async function main(): Promise<void> {
  loadScriptEnv();
  const logger = new Logger('gpsid-coverage');
  const app = await NestFactory.createApplicationContext(CoverageModule, {
    logger: ['error', 'warn'],
  });
  const client = app.get(GpsidClientService);
  if (!client.isConfigured) {
    logger.error('GPS.id credentials are not set (GPSID_BASE_URL/USERNAME/PASSWORD). Aborting.');
    await app.close();
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: pgAdapter() });
  try {
    const [roster, vehicles] = await Promise.all([
      client.getVehicles(),
      prisma.vehicle.findMany({ where: { deletedAt: null }, select: { id: true, plateNumber: true } }),
    ]);
    const byPlate = new Map(vehicles.map((v) => [extractPlate(v.plateNumber), v]));
    const demoPlates = new Set(DEMO_VEHICLES.map((v) => extractPlate(v.plateNumber)));

    const matchedInDemo: Row[] = [];
    const matchedNotDemo: Row[] = [];
    const unmatched: Row[] = [];
    for (const v of roster) {
      const plate = extractPlate(v.plate ?? '');
      if (!plate) continue;
      const swat = byPlate.get(plate);
      if (swat) {
        const row: Row = {
          imei: v.imei,
          raw: v.plate ?? '',
          plate,
          swatPlate: swat.plateNumber,
          vehicleId: swat.id,
          inDemo: demoPlates.has(plate),
        };
        (row.inDemo ? matchedInDemo : matchedNotDemo).push(row);
      } else {
        unmatched.push({ imei: v.imei, raw: v.plate ?? '', plate });
      }
    }

    console.log(
      `\nGPS.id roster: ${roster.length} vehicles · SWAT vehicles: ${vehicles.length}\n` +
        `matched: ${matchedInDemo.length + matchedNotDemo.length} ` +
        `(in demo: ${matchedInDemo.length}, NOT in demo: ${matchedNotDemo.length}) · ` +
        `unmatched: ${unmatched.length}`,
    );

    const limit = showAll ? Number.MAX_SAFE_INTEGER : PREVIEW;
    printRows('✅ Matched — already in demo', matchedInDemo, limit);
    printRows('➕ Matched — NOT in demo (candidates to add to demo-fixtures.ts)', matchedNotDemo, limit);
    printRows('❓ Unmatched — no SWAT vehicle for this plate', unmatched, limit);

    if (jsonPath) {
      writeFileSync(
        jsonPath,
        JSON.stringify({ matchedInDemo, matchedNotDemo, unmatched }, null, 2),
      );
      console.log(`\nFull result written to ${jsonPath}`);
    }
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

void main();
