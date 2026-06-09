import { Module } from '@nestjs/common';

import { ArchivingController } from './archiving.controller';
import { ArchivingRepository } from './archiving.repository';
import { ArchivingService } from './archiving.service';

/**
 * Partition archiving (Phase 2, Epic 2.5). Owns the monthly archive cron, the
 * admin re-attach endpoint, and the ArchiveCatalog. Depends on the global Prisma
 * and Audit modules. The detach/compress/re-attach operations are operator-run.
 */
@Module({
  controllers: [ArchivingController],
  providers: [ArchivingService, ArchivingRepository],
})
export class ArchivingModule {}
