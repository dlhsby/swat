import { Module } from '@nestjs/common';

import { InspectionsController } from './inspections/inspections.controller';
import { InspectionsRepository } from './inspections/inspections.repository';
import { InspectionsService } from './inspections/inspections.service';
import { MaintenanceController } from './maintenance/maintenance.controller';
import { MaintenanceRepository } from './maintenance/maintenance.repository';
import { MaintenanceService } from './maintenance/maintenance.service';
import { RefuelsController } from './refuels/refuels.controller';
import { RefuelsRepository } from './refuels/refuels.repository';
import { RefuelsService } from './refuels/refuels.service';

/**
 * Vehicle-operations parity (Epic 1.17): inspection (Pemeriksaan), maintenance
 * (Perawatan), and the refuel read view (Pengisian Bahan Bakar). These existed in
 * the legacy app and gate cutover.
 */
@Module({
  controllers: [InspectionsController, MaintenanceController, RefuelsController],
  providers: [
    InspectionsService,
    InspectionsRepository,
    MaintenanceService,
    MaintenanceRepository,
    RefuelsService,
    RefuelsRepository,
  ],
})
export class OperationsModule {}
