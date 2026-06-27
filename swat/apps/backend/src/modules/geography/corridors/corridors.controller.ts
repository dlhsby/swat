import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type CorridorDto, CorridorsService } from './corridors.service';
import { CreateCorridorDto } from './dto/create-corridor.dto';
import { ListCorridorsQueryDto } from './dto/list-corridors.query.dto';
import { UpdateCorridorDto } from './dto/update-corridor.dto';

@ApiTags('corridors')
@Controller('corridors')
export class CorridorsController {
  constructor(private readonly corridors: CorridorsService) {}

  @Get()
  @RequirePermissions('corridor:read')
  @ApiOperation({ summary: 'List corridors (paginated; filter by leg or name)' })
  list(
    @Query() query: ListCorridorsQueryDto,
  ): Promise<{ data: CorridorDto[]; meta: PaginationMeta }> {
    return this.corridors.list(query);
  }

  @Get(':id')
  @RequirePermissions('corridor:read')
  @ApiOperation({ summary: 'Get a corridor by id' })
  getById(@Param('id') id: string): Promise<CorridorDto> {
    return this.corridors.getById(id);
  }

  @Post()
  @RequirePermissions('corridor:create')
  @ApiOperation({ summary: 'Create a corridor' })
  create(@Body() dto: CreateCorridorDto): Promise<CorridorDto> {
    return this.corridors.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('corridor:update')
  @ApiOperation({ summary: 'Update a corridor (re-validates geometry when changed)' })
  update(@Param('id') id: string, @Body() dto: UpdateCorridorDto): Promise<CorridorDto> {
    return this.corridors.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('corridor:delete')
  @ApiOperation({ summary: 'Soft-delete a corridor' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.corridors.remove(id);
  }
}
