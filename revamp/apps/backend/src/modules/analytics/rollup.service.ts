import { Injectable, Logger } from '@nestjs/common';

import {
  addDays,
  formatDateOnly,
  startOfMonth,
  startOfNextMonth,
  trailingDates,
} from '../../common/dates';

import { RollupRepository } from './rollup.repository';

/**
 * Rollup maintenance service (Phase 2, T-202/T-203).
 *
 * Keeps the aggregate tables (DailyTonnage, MonthlyTonnageBySource/BySite,
 * DailyFuelByVehicle, MonthlyRouteActivity) current so monitoring dashboards read
 * pre-aggregated rows instead of scanning partitioned history. Two maintenance
 * paths, both idempotent (recompute-from-scratch):
 *   - **incremental** — {@link refreshForOperationDate} on the trip write path,
 *     keeping the affected day live within a second;
 *   - **nightly** — {@link recomputeRecentDays} / {@link recomputeMonths} from the
 *     cron host, the correctness safety net that heals any incremental drift.
 */
@Injectable()
export class RollupService {
  private readonly logger = new Logger(RollupService.name);

  constructor(private readonly repo: RollupRepository) {}

  /** Recompute/upsert the daily tonnage aggregate for a given operation date. */
  async refreshDailyTonnage(date: Date): Promise<void> {
    const { amount, haulCount } = await this.repo.aggregateDailyTonnage(date);
    await this.repo.upsertDailyTonnage(date, amount, haulCount);
  }

  /** Recompute the per-vehicle daily fuel aggregate for a given date. */
  async refreshDailyFuel(date: Date): Promise<void> {
    const rows = await this.repo.aggregateDailyFuel(date);
    await this.repo.replaceDailyFuel(date, rows);
  }

  /** Recompute monthly tonnage cross-tabs (by waste source and by site) for a month. */
  async refreshMonthlyTonnage(monthAnchor: Date): Promise<void> {
    const from = startOfMonth(monthAnchor);
    const to = startOfNextMonth(monthAnchor);
    const [bySource, bySite] = await Promise.all([
      this.repo.aggregateMonthlyTonnageBySource(from, to),
      this.repo.aggregateMonthlyTonnageBySite(from, to),
    ]);
    await this.repo.replaceMonthlyTonnageBySource(from, bySource);
    await this.repo.replaceMonthlyTonnageBySite(from, bySite);
  }

  /** Recompute the monthly route-activity (ritase) cross-tab for a month. */
  async refreshMonthlyRouteActivity(monthAnchor: Date): Promise<void> {
    const from = startOfMonth(monthAnchor);
    const to = startOfNextMonth(monthAnchor);
    const rows = await this.repo.aggregateMonthlyRouteActivity(from, to);
    await this.repo.replaceMonthlyRouteActivity(from, rows);
  }

  /**
   * Incremental hook for the trip write path. Recomputes the day's tonnage and
   * fuel rollups (idempotent). Never throws — a rollup hiccup must not fail the
   * trip mutation; the nightly recompute is the safety net.
   */
  async refreshForOperationDate(date: Date): Promise<void> {
    try {
      await this.refreshDailyTonnage(date);
      await this.refreshDailyFuel(date);
    } catch (error) {
      this.logger.error(
        `Gagal memperbarui rollup harian untuk ${formatDateOnly(date)}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Nightly: recompute the trailing `days` of daily tonnage + fuel rollups. */
  async recomputeRecentDays(end: Date, days = 7): Promise<void> {
    for (const date of trailingDates(end, days)) {
      await this.refreshDailyTonnage(date);
      await this.refreshDailyFuel(date);
    }
  }

  /** Nightly: recompute monthly tonnage + route-activity rollups for each anchor month. */
  async recomputeMonths(anchors: readonly Date[]): Promise<void> {
    for (const anchor of anchors) {
      await this.refreshMonthlyTonnage(anchor);
      await this.refreshMonthlyRouteActivity(anchor);
    }
  }

  /**
   * Recompute every daily and monthly rollup across the inclusive `[from, to]`
   * day range. Idempotent (each table is recomputed from scratch), so it is safe
   * to re-run after a historical bulk import — unlike the nightly cron, which only
   * heals the trailing window. `from`/`to` are UTC day-only dates.
   */
  async backfill(from: Date, to: Date): Promise<{ days: number; months: number }> {
    let days = 0;
    for (let date = from; date.getTime() <= to.getTime(); date = addDays(date, 1)) {
      await this.refreshDailyTonnage(date);
      await this.refreshDailyFuel(date);
      days += 1;
    }
    let months = 0;
    for (
      let anchor = startOfMonth(from);
      anchor.getTime() <= to.getTime();
      anchor = startOfNextMonth(anchor)
    ) {
      await this.refreshMonthlyTonnage(anchor);
      await this.refreshMonthlyRouteActivity(anchor);
      months += 1;
    }
    this.logger.log(`Backfill rollup: ${days} hari, ${months} bulan diperbarui.`);
    return { days, months };
  }
}
