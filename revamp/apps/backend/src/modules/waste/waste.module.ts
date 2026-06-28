import { Module } from '@nestjs/common';

import { WasteSourcesController } from './waste-sources/waste-sources.controller';
import { WasteSourcesRepository } from './waste-sources/waste-sources.repository';
import { WasteSourcesService } from './waste-sources/waste-sources.service';

@Module({
  controllers: [WasteSourcesController],
  providers: [WasteSourcesService, WasteSourcesRepository],
  exports: [WasteSourcesService],
})
export class WasteModule {}
