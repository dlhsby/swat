import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { TrackQueryDto } from './dto/track.query.dto';
import {
  type TrackPointDto,
  type VehiclePositionDto,
  VehiclePositionService,
} from './vehicle-position.service';

/**
 * Hybrid fleet positions + breadcrumb track (Phase 7, T-717). The whole active
 * fleet on one feed — GPS-tracked vehicles live (online/offline) and untracked
 * vehicles placed from recorded activity. Gated by `tracking:read`.
 */
@ApiTags('gps-tracking')
@Controller()
export class VehiclePositionController {
  constructor(private readonly positions: VehiclePositionService) {}

  @Get('monitoring/fleet-positions')
  @RequirePermissions('tracking:read')
  @ApiOperation({ summary: 'Whole active fleet positions (live-gps | recorded-activity)' })
  fleet(): Promise<VehiclePositionDto[]> {
    return this.positions.fleetPositions();
  }

  @Get('gps/vehicles/:id/track')
  @RequirePermissions('tracking:read')
  @ApiOperation({ summary: 'Recent breadcrumb track for a vehicle' })
  track(@Param('id') id: string, @Query() query: TrackQueryDto): Promise<TrackPointDto[]> {
    return this.positions.track(id, query.minutes);
  }
}
