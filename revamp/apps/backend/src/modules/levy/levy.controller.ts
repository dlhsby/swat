import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../common/types/api-response';

import { CreateLevyDto } from './dto/create-levy.dto';
import { ListLevyQueryDto } from './dto/list-levy.query.dto';
import { UpdateLevyDto } from './dto/update-levy.dto';
import { type LevyDto, LevyService } from './levy.service';

@ApiTags('levies')
@Controller('levies')
export class LevyController {
  constructor(private readonly levy: LevyService) {}

  @Get()
  @RequirePermissions('levy:read')
  @ApiOperation({ summary: 'List levy (retribusi) records (paginated)' })
  list(@Query() query: ListLevyQueryDto): Promise<{ data: LevyDto[]; meta: PaginationMeta }> {
    return this.levy.list(query);
  }

  @Get(':id')
  @RequirePermissions('levy:read')
  @ApiOperation({ summary: 'Get a levy record by id' })
  getById(@Param('id') id: string): Promise<LevyDto> {
    return this.levy.getById(id);
  }

  @Post()
  @RequirePermissions('levy:create')
  @ApiOperation({ summary: 'Record a levy (retribusi) entry' })
  create(@Body() dto: CreateLevyDto): Promise<LevyDto> {
    return this.levy.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('levy:update')
  @ApiOperation({ summary: 'Update a levy record' })
  update(@Param('id') id: string, @Body() dto: UpdateLevyDto): Promise<LevyDto> {
    return this.levy.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('levy:delete')
  @ApiOperation({ summary: 'Delete a levy record' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.levy.remove(id);
  }
}
