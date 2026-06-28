import { Module } from '@nestjs/common';

import { LevyController } from './levy.controller';
import { LevyRepository } from './levy.repository';
import { LevyService } from './levy.service';

/**
 * Levy (retribusi) CRUD. Records are sourced from the legacy `retribusi` table
 * via the migration and surfaced/managed in the Monitoring → Retribusi page.
 * Gated by `levy:*`; audited via the global Prisma audit middleware.
 */
@Module({
  controllers: [LevyController],
  providers: [LevyService, LevyRepository],
  exports: [LevyService],
})
export class LevyModule {}
