import { type GpsEfficiencyRepository } from './gps-efficiency.repository';
import { GpsEfficiencyService } from './gps-efficiency.service';

const DATE = new Date('2026-06-25T10:00:00Z');
const DAY = new Date('2026-06-25T00:00:00Z');

describe('GpsEfficiencyService', () => {
  let repo: {
    vehicles: jest.Mock;
    tripRealizations: jest.Mock;
    odometerRanges: jest.Mock;
    deviationCounts: jest.Mock;
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
});
