import { formatDateOnly, todayDateOnly } from '../../common/dates';

import { RollupJobsService } from './rollup-jobs.service';
import { type RollupService } from './rollup.service';

function createRollups(): jest.Mocked<
  Pick<RollupService, 'recomputeRecentDays' | 'recomputeMonths'>
> {
  return {
    recomputeRecentDays: jest.fn().mockResolvedValue(undefined),
    recomputeMonths: jest.fn().mockResolvedValue(undefined),
  };
}

describe('RollupJobsService', () => {
  it('nightly daily job recomputes the trailing 7 days from today', async () => {
    const rollups = createRollups();
    const jobs = new RollupJobsService(rollups as unknown as RollupService);

    await jobs.nightlyDailyRollups();

    expect(rollups.recomputeRecentDays).toHaveBeenCalledWith(expect.any(Date), 7);
    const end = rollups.recomputeRecentDays.mock.calls[0]![0];
    expect(formatDateOnly(end)).toBe(formatDateOnly(todayDateOnly()));
  });

  it('nightly monthly job recomputes current + previous month', async () => {
    const rollups = createRollups();
    const jobs = new RollupJobsService(rollups as unknown as RollupService);

    await jobs.nightlyMonthlyRollups();

    expect(rollups.recomputeMonths).toHaveBeenCalledTimes(1);
    const anchors = rollups.recomputeMonths.mock.calls[0]![0];
    expect(anchors).toHaveLength(2);
    const [current, previous] = anchors as Date[];
    // The previous-month anchor is strictly before the current month anchor.
    expect(previous!.getTime()).toBeLessThan(current!.getTime());
  });
});
