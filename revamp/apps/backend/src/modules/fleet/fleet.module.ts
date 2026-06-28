import { Module } from '@nestjs/common';

import { FuelCategoriesController } from './fuel-categories/fuel-categories.controller';
import { FuelCategoriesRepository } from './fuel-categories/fuel-categories.repository';
import { FuelCategoriesService } from './fuel-categories/fuel-categories.service';
import { FuelsController } from './fuels/fuels.controller';
import { FuelsRepository } from './fuels/fuels.repository';
import { FuelsService } from './fuels/fuels.service';
import { VehicleModelsController } from './models/models.controller';
import { VehicleModelsRepository } from './models/models.repository';
import { VehicleModelsService } from './models/models.service';
import { VehicleTypesController } from './vehicle-types/vehicle-types.controller';
import { VehicleTypesRepository } from './vehicle-types/vehicle-types.repository';
import { VehicleTypesService } from './vehicle-types/vehicle-types.service';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesRepository } from './vehicles/vehicles.repository';
import { VehiclesService } from './vehicles/vehicles.service';
import { VehicleWasteSourcesController } from './vehicles/waste-sources/vehicle-waste-sources.controller';
import { VehicleWasteSourcesService } from './vehicles/waste-sources/vehicle-waste-sources.service';

/**
 * Fleet master data (Epic 1.2): vehicle applications, fuel categories, fuels,
 * vehicle models, vehicles, and the vehicle↔waste-source junction.
 */
@Module({
  controllers: [
    VehicleTypesController,
    FuelCategoriesController,
    FuelsController,
    VehicleModelsController,
    VehiclesController,
    VehicleWasteSourcesController,
  ],
  providers: [
    VehicleTypesService,
    VehicleTypesRepository,
    FuelCategoriesService,
    FuelCategoriesRepository,
    FuelsService,
    FuelsRepository,
    VehicleModelsService,
    VehicleModelsRepository,
    VehiclesService,
    VehiclesRepository,
    VehicleWasteSourcesService,
  ],
  exports: [VehiclesService, VehicleModelsService],
})
export class FleetModule {}
