import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { formatDateOnly, todayDateOnly, trailingDates } from '../../common/dates';

import { reconciliationStatus } from './monitoring.math';
import { MonitoringRepository } from './monitoring.repository';
import { type ReconciliationStatus } from './monitoring.types';

/** Number of trailing days the nightly reconciliation re-checks. */
const RECONCILIATION_WINDOW = 7;

export interface ReconciliationResult {
  readonly date: string;
  readonly dailyKg: number;
  readonly tpaKg: number | null;
  readonly status: ReconciliationStatus;
}

/**
 * Nightly TPA-inbound reconciliation (Phase 2, T-211). Compares trip-derived
 * daily tonnage against the TPA weighbridge totals over the trailing week and
 * surfaces any gap beyond the 5% tolerance in the logs — no silent failures.
 *
 * Runs at 23:30 WIB, after the rollup jobs (23:00/23:15) so it sees fresh daily
 * tonnage. The monitoring API also computes the per-day status on read
 * ({@link reconciliationStatus}); this job is the operational alert path.
 */
@Injectable()
export class TpaReconciliationService {
  private readonly logger = new Logger(TpaReconciliationService.name);

  constructor(private readonly repo: MonitoringRepository) {}

  @Cron('30 23 * * *', { timeZone: 'Asia/Jakarta' })
  async handleNightly(): Promise<void> {
    await this.reconcileRecent(todayDateOnly(), RECONCILIATION_WINDOW);
  }

  /**
   * Reconcile each active day in the trailing window. A day is "active" if it has
   * trip tonnage and/or a weighbridge total; fully empty days are skipped.
   */
  async reconcileRecent(end: Date, days = RECONCILIATION_WINDOW): Promise<ReconciliationResult[]> {
    const window = trailingDates(end, days);
    const from = window[0]!;
    const [daily, tpa] = await Promise.all([
      this.repo.dailyTonnage(from, end),
      this.repo.tpaInboundByDate(from, end),
    ]);

    const dailyByDate = new Map(daily.map((row) => [formatDateOnly(row.date), row.totalTonnageKg]));
    const tpaByDate = new Map(tpa.map((row) => [formatDateOnly(row.date), row.tpaInboundKg]));
    const activeDates = [...new Set([...dailyByDate.keys(), ...tpaByDate.keys()])].sort();

    const results = activeDates.map((date) => {
      const dailyKg = dailyByDate.get(date) ?? 0;
      const tpaKg = tpaByDate.has(date) ? tpaByDate.get(date)! : null;
      return { date, dailyKg, tpaKg, status: reconciliationStatus(dailyKg, tpaKg) };
    });

    this.logSummary(results);
    return results;
  }

  private logSummary(results: readonly ReconciliationResult[]): void {
    const discrepancies = results.filter((r) => r.status === 'DISCREPANCY');
    const pending = results.filter((r) => r.status === 'PENDING');
    this.logger.log(
      `Rekonsiliasi TPA: ${results.length} hari diperiksa, ${discrepancies.length} anomali, ${pending.length} menunggu timbangan.`,
    );
    for (const d of discrepancies) {
      this.logger.warn(`Anomali ${d.date}: trip ${d.dailyKg} kg vs TPA ${d.tpaKg ?? 0} kg (>5%).`);
    }
  }
}
