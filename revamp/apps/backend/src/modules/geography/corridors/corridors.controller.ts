import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

import { type CorridorDto, CorridorsService } from './corridors.service';
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
