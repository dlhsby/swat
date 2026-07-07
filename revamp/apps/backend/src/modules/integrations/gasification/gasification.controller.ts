import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { wibDateKey } from '../../../common/dates';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { ListGasificationQueryDto } from './dto/list-gasification.query.dto';
import { MatchGasificationDto } from './dto/match-gasification.dto';
import { SyncGasificationDto } from './dto/sync-gasification.dto';
import {
  type CandidateTripDto,
  type GasificationEntryDto,
  GasificationSyncService,
} from './gasification-sync.service';
import { type GasificationSyncResult } from './gasification.types';

/**
 * Gasification (PT Surveyor Indonesia) review + manual-sync API. Auto-sync runs on a
 * schedule; these endpoints let an operator pull on demand and fix missed matches.
 */
@ApiTags('gasification')
@Controller('gasification')
export class GasificationController {
  constructor(private readonly sync: GasificationSyncService) {}

  @Get('entries')
  @RequirePermissions('gasification:read')
  @ApiOperation({ summary: 'List pulled gasification records (filter by date/status)' })
  list(
    @Query() query: ListGasificationQueryDto,
  ): Promise<{ data: GasificationEntryDto[]; meta: PaginationMeta }> {
    return this.sync.list(query);
  }

  @Post('sync')
  @HttpCode(200)
  @RequirePermissions('gasification:sync')
  @ApiOperation({ summary: 'Pull PTSI gasification records for a date (default today) and match' })
  syncNow(@Body() dto: SyncGasificationDto): Promise<GasificationSyncResult> {
    const date = dto.date ?? wibDateKey(new Date());
    return this.sync.syncDate(date, dto.nopol);
  }

  @Get('entries/:id/candidates')
  @RequirePermissions('gasification:match')
  @ApiOperation({ summary: 'List disposal trips this entry could be matched to (plate + day)' })
  candidates(@Param('id') id: string): Promise<CandidateTripDto[]> {
    return this.sync.candidates(id);
  }

  @Post('entries/:id/match')
  @HttpCode(200)
  @RequirePermissions('gasification:match')
  @ApiOperation({ summary: 'Manually link a gasification record to a disposal trip' })
  async match(
    @Param('id') id: string,
    @Body() dto: MatchGasificationDto,
    @CurrentUser() user: SessionUser,
  ): Promise<{ message: string }> {
    await this.sync.manualMatch(id, dto.tripId, user.id);
    return { message: 'Catatan gasifikasi berhasil dicocokkan.' };
  }

  @Post('entries/:id/unmatch')
  @HttpCode(200)
  @RequirePermissions('gasification:match')
  @ApiOperation({ summary: 'Break a gasification match (revert the trip to landfill)' })
  async unmatch(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<{ message: string }> {
    await this.sync.unmatch(id, user.id);
    return { message: 'Pencocokan gasifikasi dilepas.' };
  }
}
