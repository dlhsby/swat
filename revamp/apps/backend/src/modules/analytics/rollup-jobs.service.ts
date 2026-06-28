import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { addDays, startOfMonth, todayDateOnly } from '../../common/dates';

import { RollupService } from './rollup.service';

/** Number of trailing days the nightly daily-rollup recompute heals. */
const DAILY_RECOMPUTE_WINDOW = 7;

/**
 * Cron host for the nightly rollup recompute (Phase 2, T-202/T-203).
 *
 * Mirrors {@link DailyInitService}'s `@Cron` pattern. The daily job runs first
 * (23:00 WIB) and the monthly job after it (23:15 WIB) so the monthly cross-tabs
 * see freshly recomputed daily data. Both recompute from scratch, so a missed
 * night self-heals on the next run. Thin delegate — orchestration lives in
 * {@link RollupService}.
 */
@Injectable()
export class RollupJobsService {
  private readonly logger = new Logger(RollupJobsService.name);

  constructor(private readonly rollups: RollupService) {}

  @Cron('0 23 * * *', { timeZone: 'Asia/Jakarta' })
  async nightlyDailyRollups(): Promise<void> {
    const today = todayDateOnly();
    this.logger.log(`Rollup harian: rekomputasi ${DAILY_RECOMPUTE_WINDOW} hari terakhir`);
    await this.rollups.recomputeRecentDays(today, DAILY_RECOMPUTE_WINDOW);
    this.logger.log('Rollup harian selesai');
  }

  @Cron('15 23 * * *', { timeZone: 'Asia/Jakarta' })
  async nightlyMonthlyRollups(): Promise<void> {
    const today = todayDateOnly();
    // Current month plus the previous (a verify late on the 1st can still land in
    // the prior month's partition), addressed by the last-day-of-prev-month anchor.
    const previousMonthAnchor = addDays(startOfMonth(today), -1);
    this.logger.log('Rollup bulanan: bulan berjalan + bulan sebelumnya');
    await this.rollups.recomputeMonths([today, previousMonthAnchor]);
    this.logger.log('Rollup bulanan selesai');
  }
}
