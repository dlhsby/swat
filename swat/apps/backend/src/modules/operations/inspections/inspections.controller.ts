import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateInspectionDto } from './dto/create-inspection.dto';
import { ListInspectionsQueryDto } from './dto/list-inspections.query.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { type InspectionDto, InspectionsService } from './inspections.service';

@ApiTags('vehicle-inspections')
@Controller('vehicle-inspections')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get()
  @RequirePermissions('inspection:read')
  @ApiOperation({ summary: 'List vehicle inspections (paginated)' })
  list(
    @Query() query: ListInspectionsQueryDto,
  ): Promise<{ data: InspectionDto[]; meta: PaginationMeta }> {
    return this.inspections.list(query);
  }

  @Get(':id')
  @RequirePermissions('inspection:read')
  @ApiOperation({ summary: 'Get an inspection with its checklist' })
  getById(@Param('id') id: string): Promise<InspectionDto> {
    return this.inspections.getById(id);
  }

  @Post()
  @RequirePermissions('inspection:create')
  @ApiOperation({ summary: 'Record a vehicle inspection (result derived server-side)' })
  create(
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: SessionUser,
  ): Promise<InspectionDto> {
    return this.inspections.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('inspection:update')
  @ApiOperation({ summary: 'Update an inspection (re-derives result when items change)' })
  update(@Param('id') id: string, @Body() dto: UpdateInspectionDto): Promise<InspectionDto> {
    return this.inspections.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('inspection:delete')
  @ApiOperation({ summary: 'Delete an inspection' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.inspections.remove(id);
  }
}
