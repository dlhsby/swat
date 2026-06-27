import { Module } from '@nestjs/common';

import { CorridorsController } from './corridors/corridors.controller';
import { CorridorsRepository } from './corridors/corridors.repository';
import { CorridorsService } from './corridors/corridors.service';
import { RoutesController } from './routes/routes.controller';
import { RoutesRepository } from './routes/routes.repository';
import { RoutesService } from './routes/routes.service';
import { SitesController } from './sites/sites.controller';
import { SitesRepository } from './sites/sites.repository';
import { SitesService } from './sites/sites.service';

@Module({
  controllers: [SitesController, RoutesController, CorridorsController],
  providers: [
    SitesService,
    SitesRepository,
    RoutesService,
    RoutesRepository,
    CorridorsService,
    CorridorsRepository,
  ],
  exports: [SitesService, RoutesService, CorridorsService],
})
export class GeographyModule {}
