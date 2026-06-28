import { type CacheService } from '../../cache/cache.service';
import { type PrismaService } from '../../prisma/prisma.service';

import { type CorridorRepository } from './corridor.repository';
import { type DeviationAlertService } from './deviation-alert.service';
import { DeviationMatcherService, type MatchPing } from './deviation-matcher.service';
import { type DeviationRuleRepository } from './deviation-rule.repository';

const VEHICLE = '00000000-0000-0000-0000-0000000000a1';
const NOW = new Date('2026-06-25T10:00:00Z');
const CORRIDOR = {
  geojson: { type: 'LineString', coordinates: [] },
  toleranceMeters: 150,
  source: 'route-template' as const,
};

const RULES = [
  {
    deviationType: 'off_corridor',
    enabled: true,
    hysteresisSec: 30,
    threshold: 150,
    severity: 'WARNING',
  },
  {
    deviationType: 'late_to_schedule',
    enabled: true,
    hysteresisSec: 0,
    threshold: 900,
    severity: 'INFO',
  },
];

function ping(overrides: Partial<MatchPing> = {}): MatchPing {
  return {
    vehicleId: VEHICLE,
    latitude: -7.25,
    longitude: 112.75,
    speedKmh: 20,
    recordedAt: NOW,
    ...overrides,
  };
}

interface Mocks {
  prisma: { trip: { findMany: jest.Mock } };
  corridor: {
    resolveTripCorridor: jest.Mock;
    isPointWithinCorridor: jest.Mock;
    distanceToCorridorMeters: jest.Mock;
  };
  alerts: { raiseOrCoalesce: jest.Mock; autoResolve: jest.Mock };
  rules: { list: jest.Mock };
  cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
}

function build(
  opts: {
    trips?: Array<{ id: string; targetTime: Date | null; actualTime: Date | null }>;
    within?: boolean;
    cacheGet?: number | null;
    rules?: typeof RULES;
  } = {},
): { matcher: DeviationMatcherService; m: Mocks } {
  const m: Mocks = {
    prisma: {
      trip: {
        findMany: jest
          .fn()
          .mockResolvedValue(opts.trips ?? [{ id: 't1', targetTime: null, actualTime: null }]),
      },
    },
    corridor: {
      resolveTripCorridor: jest.fn().mockResolvedValue(CORRIDOR),
      isPointWithinCorridor: jest.fn().mockResolvedValue(opts.within ?? true),
      distanceToCorridorMeters: jest.fn().mockResolvedValue(240),
    },
    alerts: {
      raiseOrCoalesce: jest.fn().mockResolvedValue(undefined),
      autoResolve: jest.fn().mockResolvedValue(0),
    },
    rules: { list: jest.fn().mockResolvedValue(opts.rules ?? RULES) },
    cache: {
      get: jest.fn().mockResolvedValue(opts.cacheGet ?? null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    },
  };
  const matcher = new DeviationMatcherService(
    m.prisma as unknown as PrismaService,
    m.corridor as unknown as CorridorRepository,
    m.alerts as unknown as DeviationAlertService,
    m.rules as unknown as DeviationRuleRepository,
    m.cache as unknown as CacheService,
  );
  return { matcher, m };
}

describe('DeviationMatcherService', () => {
  it('does nothing when the vehicle has no active leg', async () => {
    const { matcher, m } = build({ trips: [] });
    await matcher.match(ping());
    expect(m.corridor.resolveTripCorridor).not.toHaveBeenCalled();
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });

  it('skips off_corridor when the rule is disabled', async () => {
    const { matcher, m } = build({
      rules: [{ ...RULES[0]!, enabled: false }, RULES[1]!],
    });
    await matcher.match(ping());
    expect(m.corridor.resolveTripCorridor).not.toHaveBeenCalled();
  });

  it('skips off_corridor when the route has no corridor', async () => {
    const { matcher, m } = build();
    m.corridor.resolveTripCorridor.mockResolvedValue(null);
    await matcher.match(ping());
    expect(m.corridor.isPointWithinCorridor).not.toHaveBeenCalled();
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });

  it('clears hysteresis + auto-resolves when back inside the corridor', async () => {
    const { matcher, m } = build({ within: true });
    await matcher.match(ping());
    expect(m.cache.del).toHaveBeenCalledWith(`gps:hys:offc:${VEHICLE}`);
    expect(m.alerts.autoResolve).toHaveBeenCalledWith(VEHICLE, 'off_corridor');
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });

  it('marks first-seen (no alert) on the first off-corridor ping', async () => {
    const { matcher, m } = build({ within: false, cacheGet: null });
    await matcher.match(ping());
    expect(m.cache.set).toHaveBeenCalledWith(
      `gps:hys:offc:${VEHICLE}`,
      NOW.getTime(),
      expect.any(Number),
    );
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });

  it('does not alert until off-corridor is sustained past hysteresis', async () => {
    const { matcher, m } = build({ within: false, cacheGet: NOW.getTime() - 10_000 }); // 10s < 30s
    await matcher.match(ping());
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });

  it('raises off_corridor once sustained beyond hysteresis', async () => {
    const { matcher, m } = build({ within: false, cacheGet: NOW.getTime() - 60_000 }); // 60s > 30s
    await matcher.match(ping());
    expect(m.corridor.distanceToCorridorMeters).toHaveBeenCalled();
    expect(m.alerts.raiseOrCoalesce).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'off_corridor', distanceM: 240, severity: 'WARNING' }),
    );
  });

  it('raises late_to_schedule past targetTime + threshold', async () => {
    const targetTime = new Date(NOW.getTime() - 1000_000); // ~16.7 min late > 900s
    const { matcher, m } = build({
      within: true,
      trips: [{ id: 't1', targetTime, actualTime: null }],
    });
    await matcher.match(ping());
    expect(m.alerts.raiseOrCoalesce).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'late_to_schedule' }),
    );
  });

  it('does not raise late when within the threshold', async () => {
    const targetTime = new Date(NOW.getTime() - 100_000); // ~1.7 min < 900s
    const { matcher, m } = build({
      within: true,
      trips: [{ id: 't1', targetTime, actualTime: null }],
    });
    await matcher.match(ping());
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });

  it('does not raise late once the trip is actualized', async () => {
    const targetTime = new Date(NOW.getTime() - 1000_000);
    const { matcher, m } = build({
      within: true,
      trips: [{ id: 't1', targetTime, actualTime: new Date(NOW.getTime() - 500_000) }],
    });
    await matcher.match(ping());
    expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
  });
});
