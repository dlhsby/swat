import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import {
  type BackfillCorridorsResult,
  type CorridorDto,
  CorridorsService,
} from './corridors.service';
import { CreateCorridorDto } from './dto/create-corridor.dto';
import { UpdateCorridorDto } from './dto/update-corridor.dto';

@ApiTags('corridors')
@Controller()
export class CorridorsController {
  constructor(private readonly corridors: CorridorsService) {}

  @Get('routes/:routeId/corridors')
  @RequirePermissions('corridor:read')
  @ApiOperation({ summary: "List a route's corridors (default first)" })
  listForRoute(@Param('routeId') routeId: string): Promise<CorridorDto[]> {
    return this.corridors.listForRoute(routeId);
  }

  @Post('routes/:routeId/corridors')
  @RequirePermissions('corridor:create')
  @ApiOperation({ summary: 'Add a corridor to a route' })
  create(@Param('routeId') routeId: string, @Body() dto: CreateCorridorDto): Promise<CorridorDto> {
    return this.corridors.create(routeId, dto);
  }

  @Post('routes/:routeId/corridors/backfill')
  @RequirePermissions('corridor:create')
  @ApiOperation({
    summary:
      "Generate a route's default corridor on demand (idempotent; null if sites lack coords)",
  })
  backfillDefault(@Param('routeId') routeId: string): Promise<CorridorDto | null> {
    return this.corridors.backfillDefault(routeId);
  }

  @Post('routes/:routeId/corridors/preview-default')
  @RequirePermissions('corridor:create')
  @ApiOperation({
    summary:
      "Preview a route's default corridor geometry (road-snapped path + mid-points from " +
      'the route sites) WITHOUT saving — seeds the editor "build from route" action',
  })
  previewDefault(
    @Param('routeId') routeId: string,
  ): Promise<{ pathGeojson: unknown; waypoints: unknown } | null> {
    return this.corridors.previewDefaultForRoute(routeId);
  }

  @Post('corridors/backfill')
  @RequirePermissions('corridor:create')
  @ApiOperation({
    summary:
      'Bulk default-corridor backfill. Default (reset=true): delete + regenerate every ' +
      "coord-having route's default corridor road-snapped. reset=false: additive, only " +
      'routes lacking a corridor. Reports snapped/straight/skipped/errored counts.',
  })
  backfillAll(@Query('reset') reset?: string): Promise<BackfillCorridorsResult> {
    // Reset by default; only an explicit `?reset=false` opts into the additive mode.
    return this.corridors.backfillAll(reset !== 'false');
  }

  @Patch('corridors/:id')
  @RequirePermissions('corridor:update')
  @ApiOperation({ summary: 'Update a corridor (re-validates geometry when changed)' })
  update(@Param('id') id: string, @Body() dto: UpdateCorridorDto): Promise<CorridorDto> {
    return this.corridors.update(id, dto);
  }

  @Delete('corridors/:id')
  @RequirePermissions('corridor:delete')
  @ApiOperation({ summary: 'Soft-delete a corridor' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.corridors.remove(id);
  }
}
