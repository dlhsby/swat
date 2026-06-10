import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  CreateApplicationDto,
  ListApplicationsQueryDto,
  UpdateApplicationDto,
} from './vehicle-types.dto';
import { type ApplicationDto, VehicleTypesService } from './vehicle-types.service';

@ApiTags('vehicle-types')
@Controller('vehicle-types')
export class VehicleTypesController {
  constructor(private readonly applications: VehicleTypesService) {}

  @Get()
  @RequirePermissions('vehicle-type:read')
  @ApiOperation({ summary: 'List vehicle types (paginated)' })
  list(
    @Query() query: ListApplicationsQueryDto,
  ): Promise<{ data: ApplicationDto[]; meta: PaginationMeta }> {
    return this.applications.list(query);
  }

  @Get(':id')
  @RequirePermissions('vehicle-type:read')
  @ApiOperation({ summary: 'Get a vehicle type by id' })
  getById(@Param('id') id: string): Promise<ApplicationDto> {
    return this.applications.getById(id);
  }

  @Post()
  @RequirePermissions('vehicle-type:create')
  @ApiOperation({ summary: 'Create a vehicle type' })
  create(@Body() dto: CreateApplicationDto): Promise<ApplicationDto> {
    return this.applications.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('vehicle-type:update')
  @ApiOperation({ summary: 'Update a vehicle type' })
  update(@Param('id') id: string, @Body() dto: UpdateApplicationDto): Promise<ApplicationDto> {
    return this.applications.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicle-type:delete')
  @ApiOperation({ summary: 'Delete a vehicle type (blocked while referenced)' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.applications.remove(id);
  }
}
