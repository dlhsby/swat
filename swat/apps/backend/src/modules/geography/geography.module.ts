import { Module } from '@nestjs/common';

import { RoutesController } from './routes/routes.controller';
import { RoutesRepository } from './routes/routes.repository';
import { RoutesService } from './routes/routes.service';
import { SitesController } from './sites/sites.controller';
import { SitesRepository } from './sites/sites.repository';
import { SitesService } from './sites/sites.service';

@Module({
  controllers: [SitesController, RoutesController],
  providers: [SitesService, SitesRepository, RoutesService, RoutesRepository],
  exports: [SitesService, RoutesService],
})
export class GeographyModule {}
