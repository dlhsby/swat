import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { SetTripCorridorDto } from './dto/set-trip-corridor.dto';
import { UpsertRouteGeometryDto } from './dto/upsert-route-geometry.dto';
import { UpsertTripGeometryDto } from './dto/upsert-trip-geometry.dto';
import {
  type RouteGeometryDto,
  RouteGeometryService,
  type TripGeometryDto,
} from './route-geometry.service';

/**
 * Route corridor geometry (Phase 7, T-709). The reusable template lives on the
 * Route; a single day can override it on the Trip. All gated by
 * `route-geometry:manage`. Null is valid (a route/trip with no drawn corridor).
 */
@ApiTags('gps-route-geometry')
@Controller('gps')
export class RouteGeometryController {
  constructor(private readonly geometry: RouteGeometryService) {}

  @Get('routes/:routeId/geometry')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Get a route's corridor template (null if undrawn)" })
  getTemplate(@Param('routeId') routeId: string): Promise<RouteGeometryDto | null> {
    return this.geometry.getTemplate(routeId);
  }

  @Put('routes/:routeId/geometry')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Create/replace a route's corridor template" })
  upsertTemplate(
    @Param('routeId') routeId: string,
    @Body() dto: UpsertRouteGeometryDto,
  ): Promise<RouteGeometryDto> {
    return this.geometry.upsertTemplate(routeId, dto);
  }

  @Delete('routes/:routeId/geometry')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Delete a route's corridor template" })
  deleteTemplate(@Param('routeId') routeId: string): Promise<{ message: string }> {
    return this.geometry.deleteTemplate(routeId);
  }

  @Get('trips/:tripId/geometry')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Get a trip's per-day corridor override" })
  getTripOverride(@Param('tripId') tripId: string): Promise<TripGeometryDto> {
    return this.geometry.getTripOverride(tripId);
  }

  @Put('trips/:tripId/corridor')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Pick one of the route's corridors for a single day" })
  setTripCorridor(
    @Param('tripId') tripId: string,
    @Body() dto: SetTripCorridorDto,
  ): Promise<TripGeometryDto> {
    return this.geometry.setTripCorridor(tripId, dto.corridorId || null);
  }

  @Put('trips/:tripId/geometry')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Override a single day's trip corridor (freehand)" })
  setTripOverride(
    @Param('tripId') tripId: string,
    @Body() dto: UpsertTripGeometryDto,
  ): Promise<TripGeometryDto> {
    return this.geometry.setTripOverride(tripId, dto);
  }

  @Delete('trips/:tripId/geometry')
  @RequirePermissions('route-geometry:manage')
  @ApiOperation({ summary: "Clear a trip's per-day corridor override" })
  clearTripOverride(@Param('tripId') tripId: string): Promise<{ message: string }> {
    return this.geometry.clearTripOverride(tripId);
  }
}
