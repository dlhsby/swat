import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { bullRedisConnection } from '../../common/bull/bull-connection';
import { AppConfigModule } from '../../config';
import { AppConfigService } from '../../config/config.service';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { StorageModule } from '../storage/storage.module';

import { FuelReportBuilder } from './builders/fuel-report.builder';
import { LevyReportBuilder } from './builders/levy-report.builder';
import { PdfGeneratorService } from './builders/pdf-generator.service';
import { PdfReportBuilder } from './builders/pdf-report.builder';
import { RouteReportBuilder } from './builders/route-report.builder';
import { TonnageReportBuilder } from './builders/tonnage-report.builder';
import { ReportCleanupJob } from './report-cleanup.job';
import { ReportGenerationWorker } from './report-generation.worker';
import { ReportJobQueue } from './report-job.queue';
import { ReportStorageService } from './report-storage.service';
import { REPORTS_QUEUE } from './report.types';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Phase 3 report engine: async Excel/PDF generation. Reports are produced by a
 * BullMQ worker (data via {@link MonitoringService}, rollup-backed) and stored
 * in the dedicated `swat-reports` MinIO bucket with a 7-day TTL.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: bullRedisConnection(config.redisUrl),
      }),
    }),
    BullModule.registerQueue({ name: REPORTS_QUEUE }),
    MonitoringModule,
    StorageModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportJobQueue,
    ReportStorageService,
    ReportGenerationWorker,
    ReportCleanupJob,
    TonnageReportBuilder,
    FuelReportBuilder,
    RouteReportBuilder,
    LevyReportBuilder,
    PdfGeneratorService,
    PdfReportBuilder,
  ],
})
export class ReportsModule {}
