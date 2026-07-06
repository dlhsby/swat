import { type SystemConfigService } from '../../../config';
import { type CacheService } from '../../cache/cache.service';
import { type PrismaService } from '../../prisma/prisma.service';

import { type CorridorRepository } from './corridor.repository';
import { type DeviationAlertService } from './deviation-alert.service';
import { DeviationMatcherService, type MatchPing } from './deviation-matcher.service';
import { type DeviationRuleRepository } from './deviation-rule.repository';
import { type GpsActivityRepository, type HaulContext } from './gps-activity.repository';

const VEHICLE = '00000000-0000-0000-0000-0000000000a1';
const NOW = new Date('2026-06-25T10:00:00Z');
const CORRIDOR = {
  geojson: { type: 'LineString', coordinates: [] },
  toleranceMeters: 150,
  source: 'route-template' as const,
};

interface Rule {
  deviationType: string;
  enabled: boolean;
  hysteresisSec: number;
  threshold: number | null;
  severity: string;
}

const RULES: Rule[] = [
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

const DWELL_RULE: Rule = {
  deviationType: 'dwell_too_long',
  enabled: true,
  hysteresisSec: 0,
  threshold: 600,
  severity: 'INFO',
};

const SEQUENCE_RULE: Rule = {
  deviationType: 'off_sequence',
  enabled: true,
  hysteresisSec: 0,
  threshold: null,
  severity: 'WARNING',
};

const POOL = {
  id: 'pool-1',
  type: 'POOL' as const,
  latitude: -7.25,
  longitude: 112.75,
  geofenceRadiusM: 100,
};
const TPS_A = {
  id: 'tps-a',
  type: 'TPS' as const,
  latitude: -7.3,
  longitude: 112.8,
  geofenceRadiusM: 100,
};
const TPS_B = {
  id: 'tps-b',
  type: 'TPS' as const,
  latitude: -7.4,
  longitude: 112.9,
  geofenceRadiusM: 100,
};

function haulContext(overrides: Partial<HaulContext> = {}): HaulContext {
  return {
    haulId: 'haul-1',
    assignmentId: 'assign-1',
    departActualTime: NOW,
    returnActualTime: null,
    sites: [POOL, TPS_A, TPS_B],
    trips: [
      {
        id: 't1',
        status: 'IN_PROGRESS',
        arrivedAt: null,
        actualTime: null,
        destinationSiteId: TPS_A.id,
      },
    ],
    ...overrides,
  };
}

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
  activity: { loadContext: jest.Mock };
  systemConfig: { getGpsGeofenceDefaultRadiusM: jest.Mock };
}

function build(
  opts: {
    trips?: Array<{ id: string; targetTime: Date | null; actualTime: Date | null }>;
    within?: boolean;
    cacheGet?: number | string | null;
    rules?: Array<(typeof RULES)[number]>;
    ctx?: HaulContext | null;
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
    activity: { loadContext: jest.fn().mockResolvedValue(opts.ctx ?? null) },
    systemConfig: { getGpsGeofenceDefaultRadiusM: jest.fn().mockReturnValue(100) },
  };
  const matcher = new DeviationMatcherService(
    m.prisma as unknown as PrismaService,
    m.corridor as unknown as CorridorRepository,
    m.alerts as unknown as DeviationAlertService,
    m.rules as unknown as DeviationRuleRepository,
    m.cache as unknown as CacheService,
    m.activity as unknown as GpsActivityRepository,
    m.systemConfig as unknown as SystemConfigService,
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

  describe('dwell_too_long', () => {
    // A ping far from every site (POOL/TPS_A/TPS_B are all within [-7.5,-7.2]/[112.7,112.9]).
    const AWAY = { latitude: -8.0, longitude: 113.5 };

    it('does nothing without an active haul context', async () => {
      const { matcher, m } = build({ within: true, rules: [...RULES, DWELL_RULE], ctx: null });
      await matcher.match(ping(AWAY));
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
    });

    it('marks first-seen (no alert) on the first stationary-outside-geofence ping', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, DWELL_RULE],
        ctx: haulContext(),
        cacheGet: null,
      });
      await matcher.match(ping({ ...AWAY, speedKmh: 0 }));
      expect(m.cache.set).toHaveBeenCalledWith(
        `gps:hys:dwell:${VEHICLE}`,
        NOW.getTime(),
        expect.any(Number),
      );
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalledWith(
        expect.objectContaining({ alertType: 'dwell_too_long' }),
      );
    });

    it('raises dwell_too_long once sustained beyond the threshold', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, DWELL_RULE],
        ctx: haulContext(),
        cacheGet: NOW.getTime() - 700_000, // ~11.7 min > 600s threshold
      });
      await matcher.match(ping({ ...AWAY, speedKmh: 0 }));
      expect(m.alerts.raiseOrCoalesce).toHaveBeenCalledWith(
        expect.objectContaining({ alertType: 'dwell_too_long', distanceM: null, severity: 'INFO' }),
      );
    });

    it('does not dwell while moving', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, DWELL_RULE],
        ctx: haulContext(),
        cacheGet: NOW.getTime() - 700_000,
      });
      await matcher.match(ping({ ...AWAY, speedKmh: 30 }));
      expect(m.cache.del).toHaveBeenCalledWith(`gps:hys:dwell:${VEHICLE}`);
      expect(m.alerts.autoResolve).toHaveBeenCalledWith(VEHICLE, 'dwell_too_long');
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalledWith(
        expect.objectContaining({ alertType: 'dwell_too_long' }),
      );
    });

    it('does not dwell while stopped inside a site geofence (loading/dumping)', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, DWELL_RULE],
        ctx: haulContext(),
        cacheGet: NOW.getTime() - 700_000,
      });
      // TPS_A's coordinates — inside its geofence.
      await matcher.match(
        ping({ latitude: TPS_A.latitude, longitude: TPS_A.longitude, speedKmh: 0 }),
      );
      expect(m.alerts.autoResolve).toHaveBeenCalledWith(VEHICLE, 'dwell_too_long');
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalledWith(
        expect.objectContaining({ alertType: 'dwell_too_long' }),
      );
    });
  });

  describe('off_sequence', () => {
    it('does not alert entering the expected (active leg) site', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, SEQUENCE_RULE],
        ctx: haulContext(), // trip t1 → destination TPS_A, IN_PROGRESS
      });
      await matcher.match(ping({ latitude: TPS_A.latitude, longitude: TPS_A.longitude }));
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalledWith(
        expect.objectContaining({ alertType: 'off_sequence' }),
      );
    });

    it('does not alert entering the POOL', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, SEQUENCE_RULE],
        ctx: haulContext(),
      });
      await matcher.match(ping({ latitude: POOL.latitude, longitude: POOL.longitude }));
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalledWith(
        expect.objectContaining({ alertType: 'off_sequence' }),
      );
    });

    it('raises off_sequence once entering an unexpected site', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, SEQUENCE_RULE],
        ctx: haulContext(), // expects TPS_A, vehicle enters TPS_B instead
        cacheGet: null,
      });
      await matcher.match(ping({ latitude: TPS_B.latitude, longitude: TPS_B.longitude }));
      expect(m.cache.set).toHaveBeenCalledWith(
        `gps:hys:seq:${VEHICLE}`,
        TPS_B.id,
        expect.any(Number),
      );
      expect(m.alerts.raiseOrCoalesce).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'off_sequence',
          distanceM: null,
          severity: 'WARNING',
        }),
      );
    });

    it('does not re-raise while still inside the same wrong site', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, SEQUENCE_RULE],
        ctx: haulContext(),
        cacheGet: TPS_B.id, // already flagged for this same wrong site
      });
      await matcher.match(ping({ latitude: TPS_B.latitude, longitude: TPS_B.longitude }));
      expect(m.alerts.raiseOrCoalesce).not.toHaveBeenCalled();
    });

    it('auto-resolves on leaving the wrong site', async () => {
      const { matcher, m } = build({
        within: true,
        rules: [...RULES, SEQUENCE_RULE],
        ctx: haulContext(),
        cacheGet: TPS_B.id,
      });
      // Away from every site now.
      await matcher.match(ping({ latitude: -8.0, longitude: 113.5 }));
      expect(m.cache.del).toHaveBeenCalledWith(`gps:hys:seq:${VEHICLE}`);
      expect(m.alerts.autoResolve).toHaveBeenCalledWith(VEHICLE, 'off_sequence');
    });
  });
});
