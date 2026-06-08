import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { BulkImportFuelQuotasDto, type BulkImportResult } from './dto/bulk-import-fuel-quotas.dto';
import { CreateFuelQuotaDto } from './dto/create-fuel-quota.dto';
import { ListFuelQuotasQueryDto } from './dto/list-fuel-quotas.query.dto';
import { UpdateFuelQuotaDto } from './dto/update-fuel-quota.dto';
import { type FuelQuotaDto, FuelQuotasService } from './fuel-quotas.service';

@ApiTags('fuel-quotas')
@Controller('fuel-quotas')
export class FuelQuotasController {
  constructor(private readonly fuelQuotas: FuelQuotasService) {}

  @Get()
  @RequirePermissions('fuel-quota:read')
  @ApiOperation({ summary: 'List fuel quotas (kitir, paginated)' })
  list(
    @Query() query: ListFuelQuotasQueryDto,
  ): Promise<{ data: FuelQuotaDto[]; meta: PaginationMeta }> {
    return this.fuelQuotas.list(query);
  }

  @Get(':id')
  @RequirePermissions('fuel-quota:read')
  @ApiOperation({ summary: 'Get a fuel quota by id' })
  getById(@Param('id') id: string): Promise<FuelQuotaDto> {
    return this.fuelQuotas.getById(id);
  }

  @Post()
  @RequirePermissions('fuel-quota:create')
  @ApiOperation({ summary: 'Issue a fuel quota (kitir)' })
  create(@Body() dto: CreateFuelQuotaDto, @CurrentUser() user: SessionUser): Promise<FuelQuotaDto> {
    return this.fuelQuotas.create(dto, user.id);
  }

  @Post('bulk-import')
  @RequirePermissions('fuel-quota:create')
  @ApiOperation({ summary: 'Bulk-import fuel quotas (Impor Massal); upsert by legacyId' })
  bulkImport(
    @Body() dto: BulkImportFuelQuotasDto,
    @CurrentUser() user: SessionUser,
  ): Promise<BulkImportResult> {
    return this.fuelQuotas.bulkImport(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('fuel-quota:update')
  @ApiOperation({ summary: 'Extend or revoke a fuel quota' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFuelQuotaDto,
    @CurrentUser() user: SessionUser,
  ): Promise<FuelQuotaDto> {
    return this.fuelQuotas.update(id, dto, user.id);
  }
}
