import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles.query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { type VehicleDto, VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @RequirePermissions('vehicle:read')
  @ApiOperation({ summary: 'List vehicles (paginated)' })
  list(
    @Query() query: ListVehiclesQueryDto,
  ): Promise<{ data: VehicleDto[]; meta: PaginationMeta }> {
    return this.vehicles.list(query);
  }

  @Get(':id')
  @RequirePermissions('vehicle:read')
  @ApiOperation({ summary: 'Get a vehicle by id' })
  getById(@Param('id') id: string): Promise<VehicleDto> {
    return this.vehicles.getById(id);
  }

  @Post()
  @RequirePermissions('vehicle:create')
  @ApiOperation({ summary: 'Create a vehicle' })
  create(@Body() dto: CreateVehicleDto): Promise<VehicleDto> {
    return this.vehicles.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('vehicle:update')
  @ApiOperation({ summary: 'Update a vehicle (odometer is monotonic)' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto): Promise<VehicleDto> {
    return this.vehicles.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicle:delete')
  @ApiOperation({ summary: 'Soft-delete a vehicle' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.vehicles.remove(id);
  }
}
