import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type DeviationAlertDto, DeviationAlertService } from './deviation-alert.service';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';
import { ListAlertsQueryDto } from './dto/list-alerts.query.dto';

/**
 * Deviation alert feed (Phase 7, T-714). Supervisors read the live/historical feed
 * (filter by vehicle / acknowledged / resolved / date) and acknowledge alerts.
 */
@ApiTags('gps-alerts')
@Controller('gps/alerts')
export class DeviationAlertController {
  constructor(private readonly alerts: DeviationAlertService) {}

  @Get()
  @RequirePermissions('deviation-alert:read')
  @ApiOperation({ summary: 'List deviation alerts (filterable, paginated)' })
  list(
    @Query() query: ListAlertsQueryDto,
  ): Promise<{ data: DeviationAlertDto[]; meta: PaginationMeta }> {
    return this.alerts.list(query);
  }

  @Patch(':id/acknowledge')
  @RequirePermissions('deviation-alert:acknowledge')
  @ApiOperation({ summary: 'Acknowledge a deviation alert (+ optional note)' })
  acknowledge(
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
    @CurrentUser() user: SessionUser,
  ): Promise<DeviationAlertDto> {
    return this.alerts.acknowledge(id, user?.id ?? null, dto.notes);
  }
}
