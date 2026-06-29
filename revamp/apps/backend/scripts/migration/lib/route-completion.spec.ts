import type { SiteType } from '@prisma/client';

import { generateCompletionRoutes, haversineKm, routeKey, type SiteLite } from './route-completion';

const site = (
  id: string,
  type: SiteType,
  lat: number | null = null,
  lng: number | null = null,
): SiteLite => ({
  id,
  type,
  latitude: lat,
  longitude: lng,
});

describe('generateCompletionRoutes', () => {
  // 2 POOL, 1 SPBU, 2 TPS, 1 TPA = 6 sites.
  const sites: SiteLite[] = [
    site('p1', 'POOL'),
    site('p2', 'POOL'),
    site('spbu', 'SPBU'),
    site('tps1', 'TPS'),
    site('tps2', 'TPS'),
    site('tpa', 'TPA'),
  ];
  const all = generateCompletionRoutes(sites);
  const of = (c: string): typeof all => all.filter((r) => r.category === c);

  it('PICKUP: every non-TPS origin → each TPS', () => {
    // non-TPS = p1,p2,spbu,tpa = 4 origins × 2 TPS = 8
    expect(of('PICKUP')).toHaveLength(8);
    expect(of('PICKUP').every((r) => ['tps1', 'tps2'].includes(r.destinationSiteId))).toBe(true);
    expect(of('PICKUP').some((r) => r.originSiteId === 'tps1')).toBe(false);
  });

  it('REFUEL: every non-SPBU origin → the SPBU', () => {
    // non-SPBU = 5 origins × 1 SPBU = 5
    expect(of('REFUEL')).toHaveLength(5);
    expect(of('REFUEL').every((r) => r.destinationSiteId === 'spbu')).toBe(true);
  });

  it('DISPOSAL: every non-TPA origin → the TPA', () => {
    // non-TPA = 5 origins × 1 TPA = 5
    expect(of('DISPOSAL')).toHaveLength(5);
    expect(of('DISPOSAL').every((r) => r.destinationSiteId === 'tpa')).toBe(true);
  });

  it('RETURN_POOL: any origin → each POOL, excluding self-loops', () => {
    // 6 origins × 2 POOL = 12, minus the 2 self-loops (p1→p1, p2→p2) = 10
    expect(of('RETURN_POOL')).toHaveLength(10);
    expect(of('RETURN_POOL').every((r) => ['p1', 'p2'].includes(r.destinationSiteId))).toBe(true);
    expect(of('RETURN_POOL').some((r) => r.originSiteId === r.destinationSiteId)).toBe(false);
  });

  it('DEPART_POOL: each POOL site to itself', () => {
    expect(of('DEPART_POOL')).toHaveLength(2);
    expect(of('DEPART_POOL').every((r) => r.originSiteId === r.destinationSiteId)).toBe(true);
  });

  it('produces no duplicate (origin, dest, category) keys', () => {
    const keys = all.map((r) => routeKey(r.originSiteId, r.destinationSiteId, r.category));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('haversineKm', () => {
  it('is 0 when an endpoint lacks coordinates', () => {
    expect(haversineKm(site('a', 'POOL', -7.2, 112.7), site('b', 'TPS'))).toBe(0);
  });
  it('computes a sane whole-km distance (Surabaya ~ a few km apart)', () => {
    const d = haversineKm(site('a', 'POOL', -7.2575, 112.7521), site('b', 'TPS', -7.3, 112.78));
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(10);
  });
  it('is 0 for the same point (DEPART_POOL self-loop)', () => {
    expect(haversineKm(site('a', 'POOL', -7.2, 112.7), site('a', 'POOL', -7.2, 112.7))).toBe(0);
  });
});
