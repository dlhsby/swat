/**
 * Default-corridor backfill — ensure EVERY route has a default corridor
 * (`isDefault=true`), road-snapped via the backend Google Directions API when
 * `GOOGLE_MAPS_SERVER_KEY` is set, straight-line otherwise. Shared by the demo
 * seeder, the legacy/staging migration, and the standalone `corridors:backfill`
 * runner so corridors are baked in once and never need regenerating.
 *
 * Reuses the real `CorridorsService.createDefaultForRoute` (same logic the app uses
 * on route create/edit): snap-or-straight-line, PostGIS `ST_Length`, and a synced
 * `Route.distanceKm`. Idempotent — routes that already have a corridor are skipped.
 *
 * NOTE: with a Google key this issues one Directions call per route missing a
 * corridor (a route at staging volume = ~17k routes → ~17k calls, billable). Without
 * a key it's free (straight-line). Snapping only runs where the key is present.
 */
import { type PrismaClient } from '@prisma/client';

import { type AppConfigService } from '../../src/config/config.service';
import { CorridorsRepository } from '../../src/modules/geography/corridors/corridors.repository';
import { CorridorsService } from '../../src/modules/geography/corridors/corridors.service';
import { GoogleDirectionsService } from '../../src/modules/geography/corridors/google-directions.service';
import { type PrismaService } from '../../src/modules/prisma/prisma.service';

export interface CorridorBackfillStats {
  totalRoutes: number;
  alreadyHad: number;
  created: number;
  snapped: number;
  straightLine: number;
  skippedNoCoords: number;
}

/** Build a CorridorsService over a bare PrismaClient (script context, no Nest DI). */
function buildCorridorsService(prisma: PrismaClient): {
  service: CorridorsService;
  repo: CorridorsRepository;
} {
  const repo = new CorridorsRepository(prisma as unknown as PrismaService);
  // GoogleDirectionsService only reads `config.googleMapsServerKey`, so a minimal
  // stub avoids wiring the full Nest config. Unset key → snapDrivingRoute returns
  // null → straight-line fallback (no API call billed).
  const directions = new GoogleDirectionsService({
    googleMapsServerKey: process.env.GOOGLE_MAPS_SERVER_KEY,
  } as unknown as AppConfigService);
  return { service: new CorridorsService(repo, directions), repo };
}

/**
 * Create a default corridor for every route that lacks one. Bounded concurrency so
 * a key-present run doesn't hammer Google; failures degrade to a straight line inside
 * the service (or are counted as skipped when a route's sites have no coordinates).
 */
export async function backfillRouteCorridors(
  prisma: PrismaClient,
  opts: { concurrency?: number; log?: (msg: string) => void } = {},
): Promise<CorridorBackfillStats> {
  const log = opts.log ?? ((): void => {});
  const snapping = Boolean(process.env.GOOGLE_MAPS_SERVER_KEY);
  // Straight-line is DB-bound → parallelize hard; Google-snapping is rate-limited → go gentle.
  // Override with CORRIDOR_BACKFILL_CONCURRENCY.
  const envConc = Number(process.env.CORRIDOR_BACKFILL_CONCURRENCY);
  const concurrency = Math.max(
    1,
    opts.concurrency ?? (Number.isInteger(envConc) && envConc > 0 ? envConc : snapping ? 6 : 24),
  );
  const { service, repo } = buildCorridorsService(prisma);

  const routes = await prisma.route.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  const stats: CorridorBackfillStats = {
    totalRoutes: routes.length,
    alreadyHad: 0,
    created: 0,
    snapped: 0,
    straightLine: 0,
    skippedNoCoords: 0,
  };
  log(
    `Corridor backfill: ${routes.length} routes @ concurrency ${concurrency}, ${snapping ? 'road-snapping via Google' : 'straight-line (no GOOGLE_MAPS_SERVER_KEY)'}.`,
  );

  for (let i = 0; i < routes.length; i += concurrency) {
    const batch = routes.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (r) => {
        try {
          if (await repo.hasAny(r.id)) {
            stats.alreadyHad += 1;
            return;
          }
          const corridor = await service.createDefaultForRoute(r.id);
          if (!corridor) {
            stats.skippedNoCoords += 1;
            return;
          }
          stats.created += 1;
          if (corridor.source === 'directions') stats.snapped += 1;
          else stats.straightLine += 1;
        } catch {
          // Endpoint/geometry error → leave the route without a corridor (counted as skip).
          stats.skippedNoCoords += 1;
        }
      }),
    );
    if (i > 0 && (i / concurrency) % 100 === 0) {
      log(`Corridor backfill: ${stats.created} created / ${i + batch.length} processed…`);
    }
  }

  log(
    `Corridor backfill done: ${stats.created} created (${stats.snapped} snapped, ${stats.straightLine} straight), ` +
      `${stats.alreadyHad} already had one, ${stats.skippedNoCoords} skipped (no site coords).`,
  );
  return stats;
}
