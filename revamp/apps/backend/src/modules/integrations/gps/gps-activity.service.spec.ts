import { type SystemConfigService } from '../../../config';
import { type CacheService } from '../../cache/cache.service';

import { type GpsActivityRepository, type HaulContext } from './gps-activity.repository';
import { GpsActivityService, haversineMeters } from './gps-activity.service';

const POOL = {
  id: 'pool',
  type: 'POOL' as const,
  latitude: -7.25,
  longitude: 112.75,
  geofenceRadiusM: 150,
};
const TPS = {
  id: 'tps',
  type: 'TPS' as const,
  latitude: -7.2,
  longitude: 112.6,
  geofenceRadiusM: 150,
};

const baseCtx = (over: Partial<HaulContext> = {}): HaulContext => ({
  haulId: 'h1',
  assignmentId: 'a1',
  departActualTime: null,
  returnActualTime: null,
  sites: [POOL, TPS],
  trips: [{ id: 't1', status: 'IN_PROGRESS', arrivedAt: null, actualTime: null, destinationSiteId: 'tps' }],
  ...over,
});

const ping = (lat: number, lng: number): { vehicleId: string; latitude: number; longitude: number; speedKmh: number; recordedAt: Date } => ({
  vehicleId: 'veh1',
  latitude: lat,
  longitude: lng,
  speedKmh: 20,
  recordedAt: new Date('2026-07-03T04:00:00.000Z'),
});

const AT_POOL = ping(-7.25, 112.75);
const AT_TPS = ping(-7.2, 112.6);
const FAR = ping(-7.35, 112.9);

interface Mocks {
  repo: {
    loadContext: jest.Mock;
    stampDepart: jest.Mock;
    stampReturn: jest.Mock;
    stampArrive: jest.Mock;
    stampComplete: jest.Mock;
    writeEvent: jest.Mock;
  };
  cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
}

function build(ctx: HaulContext | null, prevSiteId: string | null): { svc: GpsActivityService; m: Mocks } {
  const m: Mocks = {
    repo: {
      loadContext: jest.fn().mockResolvedValue(ctx),
      stampDepart: jest.fn().mockResolvedValue(true),
      stampReturn: jest.fn().mockResolvedValue(true),
      stampArrive: jest.fn().mockResolvedValue(true),
      stampComplete: jest.fn().mockResolvedValue(true),
      writeEvent: jest.fn().mockResolvedValue(undefined),
    },
    cache: {
      get: jest.fn().mockResolvedValue(prevSiteId),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    },
  };
  const svc = new GpsActivityService(
    m.repo as unknown as GpsActivityRepository,
    m.cache as unknown as CacheService,
    { getGpsGeofenceDefaultRadiusM: () => 100 } as unknown as SystemConfigService,
  );
  return { svc, m };
}

const kinds = (writeEvent: jest.Mock): string[] =>
  writeEvent.mock.calls.map((c) => (c[0] as { kind: string }).kind);

describe('haversineMeters', () => {
  it('is ~0 for the same point and grows with distance', () => {
    expect(haversineMeters(-7.25, 112.75, -7.25, 112.75)).toBeCloseTo(0, 5);
    expect(haversineMeters(-7.25, 112.75, -7.2, 112.6)).toBeGreaterThan(10_000);
  });
});

describe('GpsActivityService.track', () => {
  it('no-ops when there is no active haul', async () => {
    const { svc, m } = build(null, null);
    await svc.track(AT_POOL);
    expect(m.cache.set).not.toHaveBeenCalled();
    expect(m.repo.writeEvent).not.toHaveBeenCalled();
  });

  it('entering the pool at day start marks position but raises no event', async () => {
    const { svc, m } = build(baseCtx(), null);
    await svc.track(AT_POOL);
    expect(m.repo.writeEvent).not.toHaveBeenCalled();
    expect(m.cache.set).toHaveBeenCalledWith('gps:inside:veh1', 'pool', expect.any(Number));
  });

  it('leaving the pool stamps DEPART', async () => {
    const { svc, m } = build(baseCtx(), 'pool');
    await svc.track(FAR);
    expect(m.repo.stampDepart).toHaveBeenCalledWith('a1', AT_POOL.recordedAt);
    expect(kinds(m.repo.writeEvent)).toEqual(['DEPART']);
    expect(m.cache.del).toHaveBeenCalledWith('gps:inside:veh1');
  });

  it('entering a TPS stamps ARRIVE for the matching leg', async () => {
    const { svc, m } = build(baseCtx({ departActualTime: new Date() }), null);
    await svc.track(AT_TPS);
    expect(m.repo.stampArrive).toHaveBeenCalledWith('t1', AT_TPS.recordedAt);
    expect(kinds(m.repo.writeEvent)).toEqual(['ARRIVE']);
    expect(m.cache.set).toHaveBeenCalledWith('gps:inside:veh1', 'tps', expect.any(Number));
  });

  it('leaving a TPS stamps COMPLETE', async () => {
    const ctx = baseCtx({
      departActualTime: new Date(),
      trips: [{ id: 't1', status: 'ARRIVED', arrivedAt: new Date(), actualTime: null, destinationSiteId: 'tps' }],
    });
    const { svc, m } = build(ctx, 'tps');
    await svc.track(FAR);
    expect(m.repo.stampComplete).toHaveBeenCalledWith('t1', AT_TPS.recordedAt);
    expect(kinds(m.repo.writeEvent)).toEqual(['COMPLETE']);
  });

  it('returning to the pool after departing stamps RETURN', async () => {
    const { svc, m } = build(baseCtx({ departActualTime: new Date() }), null);
    await svc.track(AT_POOL);
    expect(m.repo.stampReturn).toHaveBeenCalledWith('a1', AT_POOL.recordedAt);
    expect(kinds(m.repo.writeEvent)).toEqual(['RETURN']);
  });

  it('does not raise RETURN when the pool was never departed', async () => {
    const { svc, m } = build(baseCtx(), null);
    await svc.track(AT_POOL);
    expect(m.repo.stampReturn).not.toHaveBeenCalled();
  });

  it('still raises RETURN when a leg progressed but DEPART was missed', async () => {
    // departActualTime null (missed), but a leg already arrived → the haul has run.
    const ctx = baseCtx({
      trips: [{ id: 't1', status: 'DONE', arrivedAt: new Date(), actualTime: new Date(), destinationSiteId: 'tps' }],
    });
    const { svc, m } = build(ctx, null);
    await svc.track(AT_POOL);
    expect(m.repo.stampReturn).toHaveBeenCalledWith('a1', AT_POOL.recordedAt);
    expect(kinds(m.repo.writeEvent)).toEqual(['RETURN']);
  });

  it('emits nothing when the idempotent stamp reports no change', async () => {
    const { svc, m } = build(baseCtx({ departActualTime: new Date() }), null);
    m.repo.stampArrive.mockResolvedValue(false);
    await svc.track(AT_TPS);
    expect(m.repo.writeEvent).not.toHaveBeenCalled();
  });

  it('does nothing when the geofence state is unchanged', async () => {
    const { svc, m } = build(baseCtx(), 'pool');
    await svc.track(AT_POOL); // still inside pool
    expect(m.repo.stampDepart).not.toHaveBeenCalled();
    expect(m.repo.writeEvent).not.toHaveBeenCalled();
    expect(m.cache.set).not.toHaveBeenCalled();
  });
});
