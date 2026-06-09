import { parseDateOnly } from '../../common/dates';

import { type RollupRepository } from './rollup.repository';
import { RollupService } from './rollup.service';

type MockRepo = jest.Mocked<RollupRepository>;

function createRepo(): MockRepo {
  return {
    aggregateDailyTonnage: jest.fn().mockResolvedValue({ amount: 0n, haulCount: 0 }),
    upsertDailyTonnage: jest.fn().mockResolvedValue(undefined),
    aggregateMonthlyTonnageBySource: jest.fn().mockResolvedValue([]),
    aggregateMonthlyTonnageBySite: jest.fn().mockResolvedValue([]),
    aggregateMonthlyRouteActivity: jest.fn().mockResolvedValue([]),
    aggregateDailyFuel: jest.fn().mockResolvedValue([]),
    replaceMonthlyTonnageBySource: jest.fn().mockResolvedValue(undefined),
    replaceMonthlyTonnageBySite: jest.fn().mockResolvedValue(undefined),
    replaceMonthlyRouteActivity: jest.fn().mockResolvedValue(undefined),
    replaceDailyFuel: jest.fn().mockResolvedValue(undefined),
    describeDate: jest.fn((date: Date) => date.toISOString().slice(0, 10)),
  } as unknown as MockRepo;
}

describe('RollupService', () => {
  let repo: MockRepo;
  let service: RollupService;

  beforeEach(() => {
    repo = createRepo();
    service = new RollupService(repo);
  });

  describe('refreshDailyTonnage', () => {
    it('aggregates the day then upserts the returned totals', async () => {
      const date = parseDateOnly('2026-06-08');
      repo.aggregateDailyTonnage.mockResolvedValue({ amount: 45200n, haulCount: 12 });

      await service.refreshDailyTonnage(date);

      expect(repo.aggregateDailyTonnage).toHaveBeenCalledWith(date);
      expect(repo.upsertDailyTonnage).toHaveBeenCalledWith(date, 45200n, 12);
    });
  });

  describe('refreshDailyFuel', () => {
    it('aggregates then replaces the day rows', async () => {
      const date = parseDateOnly('2026-06-08');
      const rows = [{ vehicleId: 1, fuelApprovedLiters: '80', fuelRequestedLiters: '100' }];
      repo.aggregateDailyFuel.mockResolvedValue(rows);

      await service.refreshDailyFuel(date);

      expect(repo.aggregateDailyFuel).toHaveBeenCalledWith(date);
      expect(repo.replaceDailyFuel).toHaveBeenCalledWith(date, rows);
    });
  });

  describe('refreshMonthlyTonnage', () => {
    it('aggregates by source and site over the anchor month and replaces both', async () => {
      const from = parseDateOnly('2026-06-01');
      const to = parseDateOnly('2026-07-01');
      repo.aggregateMonthlyTonnageBySource.mockResolvedValue([
        { wasteSourceId: 1, totalNetWeight: 25000n, haulCount: 5 },
      ]);
      repo.aggregateMonthlyTonnageBySite.mockResolvedValue([
        { siteId: 7, totalNetWeight: 25000n, haulCount: 5 },
      ]);

      await service.refreshMonthlyTonnage(parseDateOnly('2026-06-18'));

      expect(repo.aggregateMonthlyTonnageBySource).toHaveBeenCalledWith(from, to);
      expect(repo.aggregateMonthlyTonnageBySite).toHaveBeenCalledWith(from, to);
      expect(repo.replaceMonthlyTonnageBySource).toHaveBeenCalledWith(from, [
        { wasteSourceId: 1, totalNetWeight: 25000n, haulCount: 5 },
      ]);
      expect(repo.replaceMonthlyTonnageBySite).toHaveBeenCalledWith(from, [
        { siteId: 7, totalNetWeight: 25000n, haulCount: 5 },
      ]);
    });
  });

  describe('refreshMonthlyRouteActivity', () => {
    it('aggregates ritase over the anchor month and replaces it', async () => {
      const from = parseDateOnly('2026-06-01');
      const to = parseDateOnly('2026-07-01');
      repo.aggregateMonthlyRouteActivity.mockResolvedValue([{ routeId: 3, tripCount: 9 }]);

      await service.refreshMonthlyRouteActivity(parseDateOnly('2026-06-30'));

      expect(repo.aggregateMonthlyRouteActivity).toHaveBeenCalledWith(from, to);
      expect(repo.replaceMonthlyRouteActivity).toHaveBeenCalledWith(from, [
        { routeId: 3, tripCount: 9 },
      ]);
    });
  });

  describe('refreshForOperationDate', () => {
    it('refreshes both daily tonnage and fuel for the date', async () => {
      const date = parseDateOnly('2026-06-08');

      await service.refreshForOperationDate(date);

      expect(repo.aggregateDailyTonnage).toHaveBeenCalledWith(date);
      expect(repo.aggregateDailyFuel).toHaveBeenCalledWith(date);
    });

    it('swallows errors so a rollup hiccup never fails the trip mutation', async () => {
      repo.aggregateDailyTonnage.mockRejectedValue(new Error('db down'));

      await expect(
        service.refreshForOperationDate(parseDateOnly('2026-06-08')),
      ).resolves.toBeUndefined();
    });

    it('swallows non-Error rejections too', async () => {
      repo.aggregateDailyTonnage.mockRejectedValue('connection reset');

      await expect(
        service.refreshForOperationDate(parseDateOnly('2026-06-08')),
      ).resolves.toBeUndefined();
    });
  });

  describe('recomputeRecentDays', () => {
    it('recomputes the trailing window oldest-first (default 7 days)', async () => {
      await service.recomputeRecentDays(parseDateOnly('2026-06-08'));

      const dates = repo.aggregateDailyTonnage.mock.calls.map(([d]) =>
        (d as Date).toISOString().slice(0, 10),
      );
      expect(dates).toEqual([
        '2026-06-02',
        '2026-06-03',
        '2026-06-04',
        '2026-06-05',
        '2026-06-06',
        '2026-06-07',
        '2026-06-08',
      ]);
      expect(repo.aggregateDailyFuel).toHaveBeenCalledTimes(7);
    });

    it('honours a custom window size', async () => {
      await service.recomputeRecentDays(parseDateOnly('2026-06-08'), 2);
      expect(repo.aggregateDailyTonnage).toHaveBeenCalledTimes(2);
    });
  });

  describe('recomputeMonths', () => {
    it('refreshes tonnage and route activity for each anchor month', async () => {
      await service.recomputeMonths([parseDateOnly('2026-06-18'), parseDateOnly('2026-05-31')]);

      expect(repo.aggregateMonthlyTonnageBySource).toHaveBeenCalledTimes(2);
      expect(repo.aggregateMonthlyRouteActivity).toHaveBeenCalledTimes(2);
      expect(
        repo.replaceMonthlyTonnageBySource.mock.calls.map(([m]) =>
          (m as Date).toISOString().slice(0, 10),
        ),
      ).toEqual(['2026-06-01', '2026-05-01']);
    });
  });
});
