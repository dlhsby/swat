/**
 * Typed accessor for the pre-derived default corridors baked into
 * demo-corridors.json — derived once via scripts/build-demo-corridors.ts from a
 * locally Google-snapped seed run. Used by prisma/seed.ts so `seed:demo` loads
 * real road-snapped geometry for free instead of calling the Google Directions
 * API on every fresh database.
 *
 * Keyed by (originSiteLegacyId, destinationSiteLegacyId, category) rather than
 * routeLegacyId: most default corridors belong to routes `completeRoutes()`
 * generates as new data (no legacyId) on top of the curated `DEMO_ROUTES`. Since
 * `Route` is unique on that same (origin, destination, category) triple and
 * `completeRoutes()` is deterministic over the same curated sites, this key
 * covers both curated and generated routes.
 *
 * Loaded via JSON.parse (not a TS import) for the same reason as
 * demo-transaction-fixtures.ts — large literal arrays can overflow tsc.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DemoCorridor {
  readonly originSiteLegacyId: number;
  readonly destinationSiteLegacyId: number;
  readonly category: string;
  readonly name: string;
  readonly pathGeojson: unknown;
  readonly waypoints: unknown | null;
  readonly toleranceMeters: number;
  readonly lengthMeters: number;
  readonly source: string;
}

/** Matches the Route unique constraint `@@unique([originSiteId, destinationSiteId, category])`. */
export function demoCorridorKey(
  originSiteLegacyId: number,
  destinationSiteLegacyId: number,
  category: string,
): string {
  return `${originSiteLegacyId}|${destinationSiteLegacyId}|${category}`;
}

function load(): readonly DemoCorridor[] {
  try {
    return JSON.parse(
      readFileSync(join(__dirname, 'demo-corridors.json'), 'utf-8'),
    ) as DemoCorridor[];
  } catch {
    // No fixture committed yet → the seed falls back to the live Google/straight-line
    // backfill for every route (see build-demo-corridors.ts for how to generate it).
    return [];
  }
}

export const DEMO_CORRIDORS: readonly DemoCorridor[] = load();
