import { parseDateOnly } from '../../common/dates';
import { type CacheService } from '../cache/cache.service';

import { type MonitoringRepository } from './monitoring.repository';
import { MonitoringService } from './monitoring.service';

function createRepo(): jest.Mocked<MonitoringRepository> {
  return {
    dailyTonnage: jest.fn().mockResolvedValue([]),
    tpaInboundByDate: jest.fn().mockResolvedValue([]),
    monthlyTonnage: jest.fn().mockResolvedValue([]),
    tonnageBySource: jest.fn().mockResolvedValue([]),
    tonnageBySite: jest.fn().mockResolvedValue([]),
    fuelConsumption: jest.fn().mockResolvedValue([]),
    fuelByType: jest.fn().mockResolvedValue([]),
    routesActive: jest.fn().mockResolvedValue([]),
    countOperatingVehicles: jest.fn().mockResolvedValue(0),
    levySummary: jest.fn().mockResolvedValue([]),
    tripSummary: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    routeMap: jest.fn().mockResolvedValue({ sites: [], edges: [] }),
  } as unknown as jest.Mocked<MonitoringRepository>;
}

function createCache(): jest.Mocked<Pick<CacheService, 'get' | 'set'>> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
}

const RANGE = { dateFrom: '2026-06-01', dateTo: '2026-06-05' };

describe('MonitoringService', () => {
  let repo: jest.Mocked<MonitoringRepository>;
  let cache: jest.Mocked<Pick<CacheService, 'get' | 'set'>>;
  let service: MonitoringService;

  beforeEach(() => {
    repo = createRepo();
    cache = createCache();
    service = new MonitoringService(repo, cache as unknown as CacheService);
  });

  describe('caching', () => {
    it('returns the cached value without hitting the repo', async () => {
      cache.get.mockResolvedValue([{ date: '2026-06-01' }]);

      const result = await service.tonnage5Day(RANGE);

      expect(result).toEqual([{ date: '2026-06-01' }]);
      expect(repo.dailyTonnage).not.toHaveBeenCalled();
    });

    it('computes and caches on a miss', async () => {
      await service.tonnageMonthly(RANGE);

      expect(repo.monthlyTonnage).toHaveBeenCalledWith(
        parseDateOnly('2026-06-01'),
        parseDateOnly('2026-06-05'),
      );
      expect(cache.set).toHaveBeenCalledWith(
        'cache:monitoring:tonnage-monthly:2026-06-01:2026-06-05',
        [],
        15 * 60,
      );
    });
  });

  describe('tonnage5Day', () => {
    it('merges TPA inbound and derives the reconciliation status per day', async () => {
      repo.dailyTonnage.mockResolvedValue([
        { date: parseDateOnly('2026-06-01'), totalTonnageKg: 4000, haulCount: 3 },
        { date: parseDateOnly('2026-06-02'), totalTonnageKg: 5000, haulCount: 4 },
      ]);
      repo.tpaInboundByDate.mockResolvedValue([
        { date: parseDateOnly('2026-06-01'), tpaInboundKg: 4100 },
      ]);

      const result = await service.tonnage5Day(RANGE);

      expect(result).toEqual([
        {
          date: '2026-06-01',
          totalTonnageKg: 4000,
          haulCount: 3,
          tpaInboundKg: 4100,
          reconciliationStatus: 'MATCHED',
        },
        {
          date: '2026-06-02',
          totalTonnageKg: 5000,
          haulCount: 4,
          tpaInboundKg: null,
          reconciliationStatus: 'PENDING',
        },
      ]);
    });
  });

  describe('tonnageBySource', () => {
    it('passes the source-group filter and uses month anchors', async () => {
      await service.tonnageBySource({ ...RANGE, group: 'SWASTA' });

      expect(repo.tonnageBySource).toHaveBeenCalledWith(
        parseDateOnly('2026-06-01'),
        parseDateOnly('2026-06-01'),
        'SWASTA',
      );
      expect(cache.get).toHaveBeenCalledWith(
        'cache:monitoring:tonnage-by-source:2026-06-01:2026-06-05:SWASTA',
      );
    });

    it('keys Semua (no group) distinctly', async () => {
      await service.tonnageBySource(RANGE);
      expect(cache.get).toHaveBeenCalledWith(
        'cache:monitoring:tonnage-by-source:2026-06-01:2026-06-05:ALL',
      );
    });
  });

  describe('fuelConsumption', () => {
    it('appends the variance + flag to each vehicle row', async () => {
      repo.fuelConsumption.mockResolvedValue([
        {
          vehicleId: '00000000-0000-0000-0000-0000000000v1',
          plateNumber: 'L 1 AB',
          fuelApprovedLiters: 80,
          fuelRequestedLiters: 100,
        },
      ]);

      const [row] = await service.fuelConsumption(RANGE);

      expect(row).toMatchObject({ variancePercent: -20, flag: 'RED' });
    });
  });

  describe('levySummary', () => {
    it('adds the integer average per transaction', async () => {
      repo.levySummary.mockResolvedValue([
        { categoryName: 'Pasar', totalAmount: 1000, transactionCount: 3 },
      ]);

      const [row] = await service.levySummary(RANGE);

      expect(row).toEqual({
        categoryName: 'Pasar',
        totalAmount: 1000,
        transactionCount: 3,
        avgPerTransaction: 333,
      });
    });
  });

  describe('tripSummary', () => {
    it('returns the rows plus pagination meta', async () => {
      repo.tripSummary.mockResolvedValue({ rows: [], total: 42 });

      const result = await service.tripSummary({ ...RANGE, page: 2, limit: 50 });

      expect(repo.tripSummary).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 50, status: undefined, routeId: undefined }),
      );
      expect(result.meta).toEqual({ total: 42, page: 2, limit: 50 });
    });

    it('passes the vehicle/driver filters through to the repo', async () => {
      await service.tripSummary({
        ...RANGE,
        page: 1,
        limit: 25,
        vehicleId: '00000000-0000-0000-0000-0000000000v9',
        driverId: '00000000-0000-0000-0000-0000000000d9',
      });

      expect(repo.tripSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: '00000000-0000-0000-0000-0000000000v9',
          driverId: '00000000-0000-0000-0000-0000000000d9',
        }),
      );
    });
  });

  describe('routeMap', () => {
    it('delegates to the repo with the month-anchored range', async () => {
      repo.routeMap.mockResolvedValue({
        sites: [
          {
            id: 's1',
            name: 'TPS A',
            type: 'TPS',
            latitude: -7.25,
            longitude: 112.75,
          },
        ],
        edges: [],
      });

      const result = await service.routeMap(RANGE);

      expect(repo.routeMap).toHaveBeenCalledWith(
        parseDateOnly('2026-06-01'),
        parseDateOnly('2026-06-01'),
      );
      expect(result.sites).toHaveLength(1);
    });
  });

  describe('kpiOverview', () => {
    it('aggregates tonnage, fuel, and route activity into one object', async () => {
      repo.dailyTonnage.mockResolvedValue([
        { date: parseDateOnly('2026-06-01'), totalTonnageKg: 4000, haulCount: 3 },
        { date: parseDateOnly('2026-06-02'), totalTonnageKg: 6000, haulCount: 5 },
      ]);
      repo.fuelConsumption.mockResolvedValue([
        {
          vehicleId: '00000000-0000-0000-0000-0000000000v1',
          plateNumber: 'L 1 AB',
          fuelApprovedLiters: 80,
          fuelRequestedLiters: 100,
        },
        {
          vehicleId: '00000000-0000-0000-0000-0000000000v2',
          plateNumber: 'L 2 CD',
          fuelApprovedLiters: 50,
          fuelRequestedLiters: 50,
        },
      ]);
      repo.routesActive.mockResolvedValue([
        {
          routeId: '00000000-0000-0000-0000-0000000000r3',
          category: 'DISPOSAL',
          originSiteName: 'TPS',
          destinationSiteName: 'TPA',
          distanceKm: 10,
          tripCount: 9,
        },
      ]);
      // Distinct operating vehicles come from the haul-based count, not fuel rows
      // (4 here vs 2 vehicles that refuelled) — proving the accurate source.
      repo.countOperatingVehicles.mockResolvedValue(4);

      const kpi = await service.kpiOverview(RANGE);

      expect(kpi).toEqual({
        totalTonnageKg: 10000,
        haulsCompleted: 8,
        fuelApprovedLiters: 130,
        fuelRequestedLiters: 150,
        vehiclesInOperation: 4,
        tripsRecorded: 9,
        routesActive: 1,
      });
      expect(repo.countOperatingVehicles).toHaveBeenCalled();
    });
  });

  describe('passthrough endpoints', () => {
    it('serve tonnage-by-site, fuel-by-type, and routes-active from the repo', async () => {
      await service.tonnageBySite(RANGE);
      await service.fuelByType(RANGE);
      await service.routesActive(RANGE);

      expect(repo.tonnageBySite).toHaveBeenCalled();
      expect(repo.fuelByType).toHaveBeenCalled();
      expect(repo.routesActive).toHaveBeenCalled();
    });
  });
});
