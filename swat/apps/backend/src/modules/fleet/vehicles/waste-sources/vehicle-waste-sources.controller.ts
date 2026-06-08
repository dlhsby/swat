import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';

import { AddVehicleWasteSourceDto } from './dto/add-vehicle-waste-source.dto';
import {
  type VehicleWasteSourceDto,
  VehicleWasteSourcesService,
} from './vehicle-waste-sources.service';

@ApiTags('vehicle-waste-sources')
@Controller('vehicles/:vehicleId/waste-sources')
export class VehicleWasteSourcesController {
  constructor(private readonly service: VehicleWasteSourcesService) {}

  @Get()
  @RequirePermissions('vehicle:read')
  @ApiOperation({ summary: 'List waste sources linked to a vehicle' })
  list(@Param('vehicleId', ParseIntPipe) vehicleId: number): Promise<VehicleWasteSourceDto[]> {
    return this.service.list(vehicleId);
  }

  @Post()
  @RequirePermissions('vehicle:update')
  @ApiOperation({ summary: 'Link a waste source to a vehicle' })
  add(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() dto: AddVehicleWasteSourceDto,
  ): Promise<VehicleWasteSourceDto> {
    return this.service.add(vehicleId, dto.wasteSourceId);
  }

  @Delete(':wasteSourceId')
  @RequirePermissions('vehicle:update')
  @ApiOperation({ summary: 'Unlink a waste source from a vehicle' })
  remove(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('wasteSourceId', ParseIntPipe) wasteSourceId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(vehicleId, wasteSourceId);
  }
}
