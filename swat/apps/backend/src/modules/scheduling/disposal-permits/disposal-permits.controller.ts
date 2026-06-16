import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type DisposalPermitDto, DisposalPermitsService } from './disposal-permits.service';
import {
  BulkImportDisposalPermitsDto,
  type BulkImportResult,
} from './dto/bulk-import-disposal-permits.dto';
import { BulkIssueDisposalPermitsDto } from './dto/bulk-issue-disposal-permits.dto';
import { CreateDisposalPermitDto } from './dto/create-disposal-permit.dto';
import { ListDisposalPermitsQueryDto } from './dto/list-disposal-permits.query.dto';
import { UpdateDisposalPermitDto } from './dto/update-disposal-permit.dto';

@ApiTags('disposal-permits')
@Controller('disposal-permits')
export class DisposalPermitsController {
  constructor(private readonly disposalPermits: DisposalPermitsService) {}

  @Get()
  @RequirePermissions('disposal-permit:read')
  @ApiOperation({ summary: 'List disposal permits (kitir, paginated)' })
  list(
    @Query() query: ListDisposalPermitsQueryDto,
  ): Promise<{ data: DisposalPermitDto[]; meta: PaginationMeta }> {
    return this.disposalPermits.list(query);
  }

  @Get(':id')
  @RequirePermissions('disposal-permit:read')
  @ApiOperation({ summary: 'Get a disposal permit by id' })
  getById(@Param('id') id: string): Promise<DisposalPermitDto> {
    return this.disposalPermits.getById(id);
  }

  @Post()
  @RequirePermissions('disposal-permit:create')
  @ApiOperation({ summary: 'Issue a disposal permit (kitir)' })
  create(@Body() dto: CreateDisposalPermitDto): Promise<DisposalPermitDto> {
    return this.disposalPermits.create(dto);
  }

  @Post('bulk-import')
  @RequirePermissions('disposal-permit:create')
  @ApiOperation({ summary: 'Bulk-import disposal permits (Impor Massal); upsert by legacyId' })
  bulkImport(@Body() dto: BulkImportDisposalPermitsDto): Promise<BulkImportResult> {
    return this.disposalPermits.bulkImport(dto);
  }

  @Post('bulk-issue')
  @RequirePermissions('disposal-permit:create')
  @ApiOperation({
    summary:
      'Issue N kitir at once (legacy insertJatahKitir); returns all permits with printable codes',
  })
  bulkIssue(@Body() dto: BulkIssueDisposalPermitsDto): Promise<DisposalPermitDto[]> {
    return this.disposalPermits.bulkIssue(dto);
  }

  @Patch(':id')
  @RequirePermissions('disposal-permit:update')
  @ApiOperation({ summary: 'Extend or revoke a disposal permit' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDisposalPermitDto,
  ): Promise<DisposalPermitDto> {
    return this.disposalPermits.update(id, dto);
  }
}
