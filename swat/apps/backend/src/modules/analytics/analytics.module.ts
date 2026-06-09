import { Module } from '@nestjs/common';

import { RollupJobsService } from './rollup-jobs.service';
import { RollupRepository } from './rollup.repository';
import { RollupService } from './rollup.service';

/**
 * Analytics & rollups (Phase 2, Epic 2.1). Owns the rollup maintenance service,
 * its raw-SQL repository, and the nightly cron host. {@link RollupService} is
 * exported so the trip write path can refresh affected days incrementally.
 */
@Module({
  providers: [RollupService, RollupRepository, RollupJobsService],
  exports: [RollupService],
})
export class AnalyticsModule {}
