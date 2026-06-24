import { Module } from '@nestjs/common';

import { MonitoringController } from './monitoring.controller';
import { MonitoringRepository } from './monitoring.repository';
import { MonitoringService } from './monitoring.service';

/**
 * Monitoring & analytics read API (Phase 2, Epic 2.2). Depends on the global
 * Prisma and Cache modules. Read-only — no audited mutations. The TPA weighbridge
 * total is surfaced as an informational column; trip tonnage is canonical.
 */
@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepository],
  exports: [MonitoringService],
})
export class MonitoringModule {}
