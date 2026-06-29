/**
 * Route completeness — generate every VALID (origin, destination, category) route
 * the operators may need, per their rules, as NEW data (no legacyId). The caller
 * inserts only the combinations that don't already exist (unique key
 * (origin, destination, category)). Pure logic is side-effect-free + unit-tested;
 * `completeRoutes(prisma)` is the thin DB orchestrator used by the demo seed, the
 * legacy migration, and the standalone `migrate:routes` script.
 *
 * Category rules (origin → destination):
 *   PICKUP      (Pengambilan Sampah) — origin = any site EXCEPT TPS; destination = TPS
 *   REFUEL      (Pengisian BBM)      — origin = any site EXCEPT SPBU; destination = SPBU
 *   DEPART_POOL (Berangkat Pool)     — origin = destination = the SAME POOL site
 *   DISPOSAL    (Pembuangan Sampah)  — origin = any site EXCEPT TPA; destination = TPA
 *   RETURN_POOL (Kembali ke Pool)    — origin = any site; destination = POOL (origin ≠ dest)
 */
import type { PrismaClient, RouteCategory, SiteType } from '@prisma/client';

export interface SiteLite {
  id: string;
  type: SiteType;
  latitude: number | null;
  longitude: number | null;
}

export interface GeneratedRoute {
  originSiteId: string;
  destinationSiteId: string;
  category: RouteCategory;
  distanceKm: number;
}

/** Unique key for a route (matches the DB unique constraint). */
export function routeKey(
  originSiteId: string,
  destinationSiteId: string,
  category: string,
): string {
  return `${originSiteId}|${destinationSiteId}|${category}`;
}

/** Whole-km great-circle distance; 0 when either endpoint lacks coordinates. */
export function haversineKm(a: SiteLite, b: SiteLite): number {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return 0;
  }
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * Every valid (origin, destination, category) route per the rules above. The
 * caller filters out combinations that already exist. DEPART_POOL is a self-loop
 * (same POOL site); the other categories exclude origin === destination.
 */
export function generateCompletionRoutes(sites: readonly SiteLite[]): GeneratedRoute[] {
  const byType = (t: SiteType): SiteLite[] => sites.filter((s) => s.type === t);
  const exceptType = (t: SiteType): SiteLite[] => sites.filter((s) => s.type !== t);
  const out: GeneratedRoute[] = [];

  const fanOut = (
    origins: readonly SiteLite[],
    destinations: readonly SiteLite[],
    category: RouteCategory,
  ): void => {
    for (const o of origins) {
      for (const d of destinations) {
        if (o.id === d.id) continue; // self-loops handled separately (DEPART_POOL)
        out.push({
          originSiteId: o.id,
          destinationSiteId: d.id,
          category,
          distanceKm: haversineKm(o, d),
        });
      }
    }
  };

  // PICKUP — any non-TPS origin → each TPS.
  fanOut(exceptType('TPS'), byType('TPS'), 'PICKUP');
  // REFUEL — any non-SPBU origin → each SPBU.
  fanOut(exceptType('SPBU'), byType('SPBU'), 'REFUEL');
  // DISPOSAL — any non-TPA origin → each TPA.
  fanOut(exceptType('TPA'), byType('TPA'), 'DISPOSAL');
  // RETURN_POOL — any origin → each POOL (origin ≠ dest).
  fanOut(sites, byType('POOL'), 'RETURN_POOL');
  // DEPART_POOL — each POOL site to itself (same location).
  for (const p of byType('POOL')) {
    out.push({
      originSiteId: p.id,
      destinationSiteId: p.id,
      category: 'DEPART_POOL',
      distanceKm: 0,
    });
  }

  return out;
}

export interface RouteCompletionStats {
  generated: number;
  byCategory: Record<string, number>;
  existing: number;
  totalAfter: number;
}

/**
 * Read sites + existing routes, insert the missing valid combinations as new
 * routes (legacyId stays null), and return what was added. Idempotent: a re-run
 * inserts 0 (every combination already exists). Uses `prisma.route.createMany`
 * with `skipDuplicates` as a second guard against the unique key.
 */
export async function completeRoutes(prisma: PrismaClient): Promise<RouteCompletionStats> {
  const sites = await prisma.site.findMany({
    select: { id: true, type: true, latitude: true, longitude: true },
  });
  const existingRoutes = await prisma.route.findMany({
    select: { originSiteId: true, destinationSiteId: true, category: true },
  });
  const existing = new Set(
    existingRoutes.map((r) => routeKey(r.originSiteId, r.destinationSiteId, r.category)),
  );

  const candidates = generateCompletionRoutes(
    sites.map((s) => ({
      id: s.id,
      type: s.type,
      latitude: s.latitude == null ? null : Number(s.latitude),
      longitude: s.longitude == null ? null : Number(s.longitude),
    })),
  ).filter((r) => !existing.has(routeKey(r.originSiteId, r.destinationSiteId, r.category)));

  const byCategory: Record<string, number> = {};
  for (const r of candidates) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

  // Chunk inserts to stay well under Postgres' bind-variable ceiling.
  const CHUNK = 5000;
  for (let i = 0; i < candidates.length; i += CHUNK) {
    await prisma.route.createMany({ data: candidates.slice(i, i + CHUNK), skipDuplicates: true });
  }

  return {
    generated: candidates.length,
    byCategory,
    existing: existing.size,
    totalAfter: existing.size + candidates.length,
  };
}
