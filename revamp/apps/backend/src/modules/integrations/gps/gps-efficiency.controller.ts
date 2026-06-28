import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { EfficiencyQueryDto } from './dto/efficiency.query.dto';
import {
  type EfficiencyDashboardDto,
  GpsEfficiencyReadService,
} from './gps-efficiency-read.service';

/**
 * Efficiency & waste dashboard (Phase 7, T-721). Management KPIs over a date
 * range: route adherence (tracked-only), wasted fuel/time, deviation counts, GPS
 * coverage + device-offline rate, plus per-vehicle/day rows. Gated monitoring:read.
 */
@ApiTags('gps-efficiency')
@Controller('monitoring')
export class GpsEfficiencyController {
  constructor(private readonly read: GpsEfficiencyReadService) {}

  @Get('efficiency')
  @RequirePermissions('monitoring:read')
  @ApiOperation({ summary: 'Fleet efficiency + waste dashboard' })
  efficiency(@Query() query: EfficiencyQueryDto): Promise<EfficiencyDashboardDto> {
    return this.read.dashboard(
      new Date(`${query.from}T00:00:00.000Z`),
      new Date(`${query.to}T00:00:00.000Z`),
    );
  }
}
