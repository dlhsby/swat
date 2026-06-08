import { RollupService } from './rollup.service';

describe('RollupService (Phase 2 stub)', () => {
  const service = new RollupService();
  const date = new Date('2026-06-08T00:00:00Z');

  it('resolves the aggregate refresh no-ops without throwing', async () => {
    await expect(service.refreshDailyTonnage(date)).resolves.toBeUndefined();
    await expect(service.refreshMonthlyTonnage(date)).resolves.toBeUndefined();
    await expect(service.refreshDailyFuel(date)).resolves.toBeUndefined();
  });
});
