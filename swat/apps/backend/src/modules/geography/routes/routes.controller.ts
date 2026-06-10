import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateRouteDto } from './dto/create-route.dto';
import { ListRoutesQueryDto } from './dto/list-routes.query.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { type RouteDto, RoutesService } from './routes.service';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Get()
  @RequirePermissions('route:read')
  @ApiOperation({ summary: 'List routes (paginated)' })
  list(@Query() query: ListRoutesQueryDto): Promise<{ data: RouteDto[]; meta: PaginationMeta }> {
    return this.routes.list(query);
  }

  @Get(':id')
  @RequirePermissions('route:read')
  @ApiOperation({ summary: 'Get a route by id' })
  getById(@Param('id') id: string): Promise<RouteDto> {
    return this.routes.getById(id);
  }

  @Post()
  @RequirePermissions('route:create')
  @ApiOperation({ summary: 'Create a route' })
  create(@Body() dto: CreateRouteDto): Promise<RouteDto> {
    return this.routes.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('route:update')
  @ApiOperation({ summary: 'Update a route' })
  update(@Param('id') id: string, @Body() dto: UpdateRouteDto): Promise<RouteDto> {
    return this.routes.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('route:delete')
  @ApiOperation({ summary: 'Soft-delete a route' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.routes.remove(id);
  }
}
