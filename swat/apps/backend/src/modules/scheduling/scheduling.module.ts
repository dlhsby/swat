import { Module } from '@nestjs/common';

import { CrewSchedulesController } from './crew-schedules/crew-schedules.controller';
import { CrewSchedulesRepository } from './crew-schedules/crew-schedules.repository';
import { CrewSchedulesService } from './crew-schedules/crew-schedules.service';
import { DisposalPermitsController } from './disposal-permits/disposal-permits.controller';
import { DisposalPermitsRepository } from './disposal-permits/disposal-permits.repository';
import { DisposalPermitsService } from './disposal-permits/disposal-permits.service';
import { TripTemplatesController } from './trip-templates/trip-templates.controller';
import { TripTemplatesService } from './trip-templates/trip-templates.service';

/**
 * Scheduling master data (Epic 1.6): crew schedules, their trip templates, and
 * disposal permits (kitir).
 */
@Module({
  controllers: [CrewSchedulesController, TripTemplatesController, DisposalPermitsController],
  providers: [
    CrewSchedulesService,
    CrewSchedulesRepository,
    TripTemplatesService,
    DisposalPermitsService,
    DisposalPermitsRepository,
  ],
  exports: [CrewSchedulesService, DisposalPermitsService],
})
export class SchedulingModule {}
