import { Injectable, Logger } from '@nestjs/common';

/**
 * Rollup maintenance service (stub).
 *
 * In Phase 2 this incrementally maintains the aggregate tables
 * (DailyTonnage, MonthlyTonnageBySource/BySite, DailyFuelByVehicle,
 * MonthlyRouteActivity) as transactions are recorded/verified, so monitoring
 * dashboards read pre-aggregated rows instead of scanning partitioned history.
 * The method signatures are fixed here so Phase 1 write paths can call them.
 */
@Injectable()
export class RollupService {
  private readonly logger = new Logger(RollupService.name);

  /** Recompute/upsert the daily tonnage aggregate for a given operation date. */
  async refreshDailyTonnage(_date: Date): Promise<void> {
    this.logger.debug('refreshDailyTonnage is a Phase 2 no-op');
  }

  /** Recompute monthly tonnage cross-tabs (by waste source and site). */
  async refreshMonthlyTonnage(_month: Date): Promise<void> {
    this.logger.debug('refreshMonthlyTonnage is a Phase 2 no-op');
  }

  /** Recompute the per-vehicle daily fuel aggregate. */
  async refreshDailyFuel(_date: Date): Promise<void> {
    this.logger.debug('refreshDailyFuel is a Phase 2 no-op');
  }
}
