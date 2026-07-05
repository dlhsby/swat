/**
 * Derive prisma/demo-corridors.json from a locally-seeded database.
 *
 * One-time/dev derivation tool — NOT part of any seed track. Re-run only when
 * `DEMO_ROUTES`/`DEMO_SITES` coordinates change (prisma/demo-fixtures.ts), since
 * that's what the baked geometry is derived from.
 *
 * Usage: with GOOGLE_MAPS_SERVER_KEY set, run `pnpm db:seed` once against a
 * fresh database so every demo route (curated + `completeRoutes()`-generated)
 * gets a road-snapped default corridor, then run this script to dump those
 * corridors to JSON and commit the result. `prisma/seed.ts` loads that JSON on
 * every subsequent seed instead of calling Google again.
 *
 *   pnpm --filter @swat/backend exec ts-node scripts/build-demo-corridors.ts
 *
 * Keyed by (originSiteLegacyId, destinationSiteLegacyId, category) — see
 * prisma/demo-corridors.ts for why. Routes whose sites aren't part of the
 * curated demo set (no legacyId) are skipped; output is sorted by key for a
 * stable diff.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { type DemoCorridor, demoCorridorKey } from '../prisma/demo-corridor-fixtures';
import { loadScriptEnv } from '../src/common/prisma/load-script-env';
import { pgAdapter } from '../src/common/prisma/pg-adapter';

if (!process.env.SEED_ENV) {
  loadScriptEnv();
}
const prisma = new PrismaClient({ adapter: pgAdapter() });

async function main(): Promise<void> {
  try {
    const rows = await prisma.corridor.findMany({
      where: { isDefault: true, deletedAt: null },
      select: {
        name: true,
        pathGeojson: true,
        waypoints: true,
        toleranceMeters: true,
        lengthMeters: true,
        source: true,
        route: {
          select: {
            category: true,
            originSite: { select: { legacyId: true } },
            destinationSite: { select: { legacyId: true } },
          },
        },
      },
    });

    let skipped = 0;
    const corridors: DemoCorridor[] = rows.flatMap((r) => {
      const originSiteLegacyId = r.route.originSite.legacyId;
      const destinationSiteLegacyId = r.route.destinationSite.legacyId;
      if (originSiteLegacyId === null || destinationSiteLegacyId === null) {
        skipped += 1;
        return [];
      }
      return [
        {
          originSiteLegacyId,
          destinationSiteLegacyId,
          category: r.route.category,
          name: r.name,
          pathGeojson: r.pathGeojson,
          waypoints: r.waypoints,
          toleranceMeters: r.toleranceMeters,
          lengthMeters: r.lengthMeters,
          source: r.source,
        },
      ];
    });
    corridors.sort((a, b) =>
      demoCorridorKey(a.originSiteLegacyId, a.destinationSiteLegacyId, a.category).localeCompare(
        demoCorridorKey(b.originSiteLegacyId, b.destinationSiteLegacyId, b.category),
      ),
    );

    const outPath = join(__dirname, '../prisma/demo-corridors.json');
    writeFileSync(outPath, `${JSON.stringify(corridors, null, 2)}\n`);
    console.log(
      `Wrote ${corridors.length} corridor(s) to ${outPath}` +
        (skipped > 0 ? ` (${skipped} skipped — sites without a legacyId)` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
