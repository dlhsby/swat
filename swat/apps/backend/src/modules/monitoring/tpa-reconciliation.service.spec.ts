import { parseDateOnly } from '../../common/dates';

import { type MonitoringRepository } from './monitoring.repository';
import { TpaReconciliationService } from './tpa-reconciliation.service';

function createRepo(): jest.Mocked<
  Pick<MonitoringRepository, 'dailyTonnage' | 'tpaInboundByDate'>
> {
  return {
    dailyTonnage: jest.fn().mockResolvedValue([]),
    tpaInboundByDate: jest.fn().mockResolvedValue([]),
  };
}

describe('TpaReconciliationService', () => {
  let repo: ReturnType<typeof createRepo>;
  let service: TpaReconciliationService;

  beforeEach(() => {
    repo = createRepo();
    service = new TpaReconciliationService(repo as unknown as MonitoringRepository);
  });

  it('flags days outside the 5% tolerance and marks missing weighbridge days PENDING', async () => {
    repo.dailyTonnage.mockResolvedValue([
      { date: parseDateOnly('2026-06-06'), totalTonnageKg: 4000, haulCount: 3 },
      { date: parseDateOnly('2026-06-07'), totalTonnageKg: 5000, haulCount: 4 },
      { date: parseDateOnly('2026-06-08'), totalTonnageKg: 6000, haulCount: 5 },
    ]);
    repo.tpaInboundByDate.mockResolvedValue([
      { date: parseDateOnly('2026-06-06'), tpaInboundKg: 4100 }, // 2.5% → MATCHED
      { date: parseDateOnly('2026-06-07'), tpaInboundKg: 6000 }, // 20% → DISCREPANCY
      // 2026-06-08 missing → PENDING
    ]);

    const results = await service.reconcileRecent(parseDateOnly('2026-06-08'));

    expect(results).toEqual([
      { date: '2026-06-06', dailyKg: 4000, tpaKg: 4100, status: 'MATCHED' },
      { date: '2026-06-07', dailyKg: 5000, tpaKg: 6000, status: 'DISCREPANCY' },
      { date: '2026-06-08', dailyKg: 6000, tpaKg: null, status: 'PENDING' },
    ]);
  });

  it('reconciles a weighbridge-only day (no trip tonnage) as a discrepancy', async () => {
    repo.tpaInboundByDate.mockResolvedValue([
      { date: parseDateOnly('2026-06-08'), tpaInboundKg: 3000 },
    ]);

    const [result] = await service.reconcileRecent(parseDateOnly('2026-06-08'));

    expect(result).toEqual({ date: '2026-06-08', dailyKg: 0, tpaKg: 3000, status: 'DISCREPANCY' });
  });

  it('queries the trailing 7-day window and skips fully empty days', async () => {
    const results = await service.reconcileRecent(parseDateOnly('2026-06-08'));
    expect(repo.dailyTonnage).toHaveBeenCalledWith(
      parseDateOnly('2026-06-02'),
      parseDateOnly('2026-06-08'),
    );
    expect(results).toEqual([]);
  });

  it('runs the nightly cron handler without throwing', async () => {
    await expect(service.handleNightly()).resolves.toBeUndefined();
    expect(repo.dailyTonnage).toHaveBeenCalled();
  });
});
