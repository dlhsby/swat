import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { ListMaintenanceQueryDto } from './dto/list-maintenance.query.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { type MaintenanceDto, MaintenanceService } from './maintenance.service';

@ApiTags('maintenance-records')
@Controller('maintenance-records')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @RequirePermissions('maintenance:read')
  @ApiOperation({ summary: 'List maintenance records (paginated)' })
  list(
    @Query() query: ListMaintenanceQueryDto,
  ): Promise<{ data: MaintenanceDto[]; meta: PaginationMeta }> {
    return this.maintenance.list(query);
  }

  @Get(':id')
  @RequirePermissions('maintenance:read')
  @ApiOperation({ summary: 'Get a maintenance record with its line items' })
  getById(@Param('id') id: string): Promise<MaintenanceDto> {
    return this.maintenance.getById(id);
  }

  @Post()
  @RequirePermissions('maintenance:create')
  @ApiOperation({ summary: 'Record a maintenance job (totalCost derived server-side)' })
  create(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() user: SessionUser,
  ): Promise<MaintenanceDto> {
    return this.maintenance.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('maintenance:update')
  @ApiOperation({ summary: 'Update a maintenance record (blocked once approved)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: SessionUser,
  ): Promise<MaintenanceDto> {
    return this.maintenance.update(id, dto, user.id);
  }

  @Patch(':id/approve')
  @RequirePermissions('maintenance:approve')
  @ApiOperation({ summary: 'Approve a maintenance record (PENDING_APPROVAL → APPROVED)' })
  approve(@Param('id') id: string, @CurrentUser() user: SessionUser): Promise<MaintenanceDto> {
    return this.maintenance.approve(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('maintenance:delete')
  @ApiOperation({ summary: 'Delete a maintenance record (blocked once approved)' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.maintenance.remove(id);
  }
}
