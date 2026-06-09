import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../common/auth/session.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { ArchivingService } from './archiving.service';
import { type ReattachOutcome } from './archiving.types';
import { ReattachDto } from './dto/reattach.dto';

/**
 * Admin partition-archive API (Phase 2, Epic 2.5, T-214). Listing is read-only;
 * re-attach is an audited, privileged mutation. The monthly archive itself runs
 * on a cron (no endpoint).
 */
@ApiTags('archiving')
@Controller('archiving')
export class ArchivingController {
  constructor(private readonly archiving: ArchivingService) {}

  @Get()
  @RequirePermissions('archive:read')
  @ApiOperation({ summary: 'List archived partitions (ArchiveCatalog)' })
  list(): ReturnType<ArchivingService['listArchives']> {
    return this.archiving.listArchives();
  }

  @Post('reattach')
  @RequirePermissions('archive:manage')
  @ApiOperation({ summary: 'Re-attach an archived partition (checksum-verified, audited)' })
  reattach(@Body() dto: ReattachDto, @CurrentUser() user: SessionUser): Promise<ReattachOutcome> {
    return this.archiving.reattach(dto.tableName, dto.period, user);
  }
}
