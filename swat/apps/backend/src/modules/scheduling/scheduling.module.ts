import { Module } from '@nestjs/common';

import { CrewSchedulesController } from './crew-schedules/crew-schedules.controller';
import { CrewSchedulesRepository } from './crew-schedules/crew-schedules.repository';
import { CrewSchedulesService } from './crew-schedules/crew-schedules.service';
import { FuelQuotasController } from './fuel-quotas/fuel-quotas.controller';
import { FuelQuotasRepository } from './fuel-quotas/fuel-quotas.repository';
import { FuelQuotasService } from './fuel-quotas/fuel-quotas.service';
import { TripTemplatesController } from './trip-templates/trip-templates.controller';
import { TripTemplatesService } from './trip-templates/trip-templates.service';

/**
 * Scheduling master data (Epic 1.6): crew schedules, their trip templates, and
 * fuel quotas (kitir).
 */
@Module({
  controllers: [CrewSchedulesController, TripTemplatesController, FuelQuotasController],
  providers: [
    CrewSchedulesService,
    CrewSchedulesRepository,
    TripTemplatesService,
    FuelQuotasService,
    FuelQuotasRepository,
  ],
  exports: [CrewSchedulesService, FuelQuotasService],
})
export class SchedulingModule {}
