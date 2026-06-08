import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  CreateVehicleModelDto,
  ListVehicleModelsQueryDto,
  UpdateVehicleModelDto,
} from './models.dto';
import { type VehicleModelDto, VehicleModelsService } from './models.service';

@ApiTags('vehicle-models')
@Controller('vehicle-models')
export class VehicleModelsController {
  constructor(private readonly models: VehicleModelsService) {}

  @Get()
  @RequirePermissions('vehicle-model:read')
  @ApiOperation({ summary: 'List vehicle models (paginated)' })
  list(
    @Query() query: ListVehicleModelsQueryDto,
  ): Promise<{ data: VehicleModelDto[]; meta: PaginationMeta }> {
    return this.models.list(query);
  }

  @Get(':id')
  @RequirePermissions('vehicle-model:read')
  @ApiOperation({ summary: 'Get a vehicle model by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<VehicleModelDto> {
    return this.models.getById(id);
  }

  @Post()
  @RequirePermissions('vehicle-model:create')
  @ApiOperation({ summary: 'Create a vehicle model' })
  create(@Body() dto: CreateVehicleModelDto): Promise<VehicleModelDto> {
    return this.models.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('vehicle-model:update')
  @ApiOperation({ summary: 'Update a vehicle model' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleModelDto,
  ): Promise<VehicleModelDto> {
    return this.models.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicle-model:delete')
  @ApiOperation({ summary: 'Delete a vehicle model (blocked while referenced)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.models.remove(id);
  }
}
