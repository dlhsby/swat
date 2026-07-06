import { type GpsEfficiencyRepository } from './gps-efficiency.repository';
import { computeDwellMinutesByVehicle, GpsEfficiencyService } from './gps-efficiency.service';

const DATE = new Date('2026-06-25T10:00:00Z');
const DAY = new Date('2026-06-25T00:00:00Z');

describe('GpsEfficiencyService', () => {
  let repo: {
    vehicles: jest.Mock;
    tripRealizations: jest.Mock;
    odometerRanges: jest.Mock;
    deviationCounts: jest.Mock;
    activityEvents: jest.Mock;
    dailyCorridorsByVehicle: jest.Mock;
    pingAdherence: jest.Mock;
    upsert: jest.Mock;
  };
  let service: GpsEfficiencyService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      vehicles: jest.fn().mockResolvedValue([]),
      tripRealizations: jest.fn().mockResolvedValue([]),
      odometerRanges: jest.fn().mockResolvedValue(new Map()),
      deviationCounts: jest.fn().mockResolvedValue(new Map()),
      activityEvents: jest.fn().mockResolvedValue([]),
      dailyCorridorsByVehicle: jest.fn().mockResolvedValue(new Map()),
      pingAdherence: jest.fn().mockResolvedValue({ within: 0, total: 0 }),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    service = new GpsEfficiencyService(repo as unknown as GpsEfficiencyRepository);
  });

  it('computes a tracked vehicle from the device odometer delta', async () => {
    repo.vehicles.mockResolvedValue([{ id: 'v1', currentFuelRatio: 5, hasDevice: true }]);
    repo.tripRealizations.mockResolvedValue([
      {
        vehicleId: 'v1',
        targetTime: new Date(DAY.getTime() + 8 * 3600_000),
        actualTime: new Date(DAY.getTime() + 8 * 3600_000 + 20 * 60_000), // 20 min late
        actualOdometer: 100,
        plannedMeters: 5000,
      },
    ]);
    repo.odometerRanges.mockResolvedValue(new Map([['v1', { minM: 1000n, maxM: 9000n }]]));
    repo.deviationCounts.mockResolvedValue(new Map([['v1', 2]]));

    await service.refreshForDate(DATE);

    expect(repo.upsert).toHaveBeenCalledWith(
      DAY,
      'v1',
      expect.objectContaining({
        positionSource: 'gps',
        plannedMeters: 5000,
        actualMeters: 8000, // 9000 - 1000
        lateMinutes: 20,
        deviationCount: 2,
        wastedFuelLiters: 0.6, // (8000-5000)/1000 km ÷ 5 km/L
        adherencePct: null,
        dwellMinutes: null,
      }),
    );
  });

  it('computes an untracked vehicle from recorded odometer (km→m)', async () => {
    repo.vehicles.mockResolvedValue([{ id: 'v2', currentFuelRatio: 4, hasDevice: false }]);
    repo.tripRealizations.mockResolvedValue([
      {
        vehicleId: 'v2',
        targetTime: null,
        actualTime: null,
        actualOdometer: 100,
        plannedMeters: 3000,
      },
      {
        vehicleId: 'v2',
        targetTime: null,
        actualTime: null,
        actualOdometer: 120,
        plannedMeters: 3000,
      },
    ]);

    await service.refreshForDate(DATE);

    expect(repo.upsert).toHaveBeenCalledWith(
      DAY,
      'v2',
      expect.objectContaining({
        positionSource: 'recorded',
        plannedMeters: 6000,
        actualMeters: 20000, // (120-100) km × 1000
        wastedFuelLiters: 3.5, // (20000-6000)/1000 ÷ 4
      }),
    );
  });

  it('skips vehicles with no activity', async () => {
    repo.vehicles.mockResolvedValue([{ id: 'v3', currentFuelRatio: 5, hasDevice: true }]);
    await service.refreshForDate(DATE);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('sums dwellMinutes from the activity-event feed', async () => {
    repo.vehicles.mockResolvedValue([{ id: 'v1', currentFuelRatio: 5, hasDevice: true }]);
    repo.tripRealizations.mockResolvedValue([
      {
        vehicleId: 'v1',
        targetTime: null,
        actualTime: null,
        actualOdometer: 100,
        plannedMeters: 5000,
      },
    ]);
    repo.activityEvents.mockResolvedValue([
      { vehicleId: 'v1', kind: 'ARRIVE', occurredAt: new Date(DAY.getTime() + 60_000) },
      { vehicleId: 'v1', kind: 'COMPLETE', occurredAt: new Date(DAY.getTime() + 660_000) }, // +10 min
    ]);

    await service.refreshForDate(DATE);

    expect(repo.upsert).toHaveBeenCalledWith(
      DAY,
      'v1',
      expect.objectContaining({ dwellMinutes: 10 }),
    );
  });

  it('computes adherencePct from the ping-within-corridor ratio (tracked only)', async () => {
    repo.vehicles.mockResolvedValue([{ id: 'v1', currentFuelRatio: 5, hasDevice: true }]);
    repo.tripRealizations.mockResolvedValue([
      {
        vehicleId: 'v1',
        targetTime: null,
        actualTime: null,
        actualOdometer: 100,
        plannedMeters: 5000,
      },
    ]);
    repo.dailyCorridorsByVehicle.mockResolvedValue(
      new Map([
        ['v1', [{ pathGeojson: { type: 'LineString', coordinates: [] }, toleranceMeters: 150 }]],
      ]),
    );
    repo.pingAdherence.mockResolvedValue({ within: 8, total: 10 });

    await service.refreshForDate(DATE);

    expect(repo.pingAdherence).toHaveBeenCalledWith('v1', DAY, expect.any(Date), expect.any(Array));
    expect(repo.upsert).toHaveBeenCalledWith(
      DAY,
      'v1',
      expect.objectContaining({ adherencePct: 80 }),
    );
  });

  it('leaves adherencePct null for an untracked vehicle even with corridors', async () => {
    repo.vehicles.mockResolvedValue([{ id: 'v2', currentFuelRatio: 4, hasDevice: false }]);
    repo.tripRealizations.mockResolvedValue([
      {
        vehicleId: 'v2',
        targetTime: null,
        actualTime: null,
        actualOdometer: 100,
        plannedMeters: 3000,
      },
    ]);
    repo.dailyCorridorsByVehicle.mockResolvedValue(
      new Map([['v2', [{ pathGeojson: {}, toleranceMeters: 150 }]]]),
    );

    await service.refreshForDate(DATE);

    expect(repo.pingAdherence).not.toHaveBeenCalled();
    expect(repo.upsert).toHaveBeenCalledWith(
      DAY,
      'v2',
      expect.objectContaining({ adherencePct: null }),
    );
  });
});

describe('computeDwellMinutesByVehicle', () => {
  it('sums ARRIVE→next-event duration per vehicle', () => {
    const totals = computeDwellMinutesByVehicle([
      { vehicleId: 'v1', kind: 'ARRIVE', occurredAt: new Date('2026-06-25T08:00:00Z') },
      { vehicleId: 'v1', kind: 'COMPLETE', occurredAt: new Date('2026-06-25T08:15:00Z') }, // +15 min
      { vehicleId: 'v1', kind: 'ARRIVE', occurredAt: new Date('2026-06-25T09:00:00Z') },
      { vehicleId: 'v1', kind: 'RETURN', occurredAt: new Date('2026-06-25T09:05:00Z') }, // +5 min
    ]);
    expect(totals.get('v1')).toBe(20);
  });

  it('ignores a trailing ARRIVE with no close-out event today', () => {
    const totals = computeDwellMinutesByVehicle([
      { vehicleId: 'v1', kind: 'DEPART', occurredAt: new Date('2026-06-25T07:00:00Z') },
      { vehicleId: 'v1', kind: 'ARRIVE', occurredAt: new Date('2026-06-25T23:50:00Z') },
    ]);
    expect(totals.get('v1')).toBeUndefined();
  });

  it('does not leak an open ARRIVE across vehicles', () => {
    const totals = computeDwellMinutesByVehicle([
      { vehicleId: 'v1', kind: 'ARRIVE', occurredAt: new Date('2026-06-25T08:00:00Z') },
      { vehicleId: 'v2', kind: 'COMPLETE', occurredAt: new Date('2026-06-25T08:30:00Z') },
    ]);
    expect(totals.get('v1')).toBeUndefined();
    expect(totals.get('v2')).toBeUndefined();
  });
});
