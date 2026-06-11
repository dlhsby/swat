import { Module } from '@nestjs/common';

import { DisposalPermitsController } from './disposal-permits/disposal-permits.controller';
import { DisposalPermitsRepository } from './disposal-permits/disposal-permits.repository';
import { DisposalPermitsService } from './disposal-permits/disposal-permits.service';
import { ScheduleTemplatesController } from './schedule-templates/schedule-templates.controller';
import { ScheduleTemplatesRepository } from './schedule-templates/schedule-templates.repository';
import { ScheduleTemplatesService } from './schedule-templates/schedule-templates.service';
import { TripTemplatesController } from './trip-templates/trip-templates.controller';
import { TripTemplatesService } from './trip-templates/trip-templates.service';

/**
 * Scheduling master data (Epic 1.6): schedule templates, their trip templates, and
 * disposal permits (kitir).
 */
@Module({
  controllers: [ScheduleTemplatesController, TripTemplatesController, DisposalPermitsController],
  providers: [
    ScheduleTemplatesService,
    ScheduleTemplatesRepository,
    TripTemplatesService,
    DisposalPermitsService,
    DisposalPermitsRepository,
  ],
  exports: [ScheduleTemplatesService, DisposalPermitsService],
})
export class SchedulingModule {}
