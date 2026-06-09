import { Module } from '@nestjs/common';

import { MonitoringController } from './monitoring.controller';
import { MonitoringRepository } from './monitoring.repository';
import { MonitoringService } from './monitoring.service';
import { TpaReconciliationService } from './tpa-reconciliation.service';

/**
 * Monitoring & analytics read API (Phase 2, Epic 2.2) plus the nightly TPA
 * reconciliation job (Epic 2.4). Depends on the global Prisma and Cache modules.
 * Read-only — no audited mutations.
 */
@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepository, TpaReconciliationService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
