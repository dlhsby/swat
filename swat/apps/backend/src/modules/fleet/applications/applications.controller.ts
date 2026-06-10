import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  CreateApplicationDto,
  ListApplicationsQueryDto,
  UpdateApplicationDto,
} from './applications.dto';
import { type ApplicationDto, ApplicationsService } from './applications.service';

@ApiTags('vehicle-applications')
@Controller('vehicle-applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @RequirePermissions('vehicle-application:read')
  @ApiOperation({ summary: 'List vehicle applications (paginated)' })
  list(
    @Query() query: ListApplicationsQueryDto,
  ): Promise<{ data: ApplicationDto[]; meta: PaginationMeta }> {
    return this.applications.list(query);
  }

  @Get(':id')
  @RequirePermissions('vehicle-application:read')
  @ApiOperation({ summary: 'Get a vehicle application by id' })
  getById(@Param('id') id: string): Promise<ApplicationDto> {
    return this.applications.getById(id);
  }

  @Post()
  @RequirePermissions('vehicle-application:create')
  @ApiOperation({ summary: 'Create a vehicle application' })
  create(@Body() dto: CreateApplicationDto): Promise<ApplicationDto> {
    return this.applications.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('vehicle-application:update')
  @ApiOperation({ summary: 'Update a vehicle application' })
  update(@Param('id') id: string, @Body() dto: UpdateApplicationDto): Promise<ApplicationDto> {
    return this.applications.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicle-application:delete')
  @ApiOperation({ summary: 'Delete a vehicle application (blocked while referenced)' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.applications.remove(id);
  }
}
