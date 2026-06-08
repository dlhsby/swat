import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateWasteSourceDto } from './dto/create-waste-source.dto';
import { ListWasteSourcesQueryDto } from './dto/list-waste-sources.query.dto';
import { UpdateWasteSourceDto } from './dto/update-waste-source.dto';
import { type WasteSourceDto, WasteSourcesService } from './waste-sources.service';

@ApiTags('waste-sources')
@Controller('waste-sources')
export class WasteSourcesController {
  constructor(private readonly wasteSources: WasteSourcesService) {}

  @Get()
  @RequirePermissions('waste-source:read')
  @ApiOperation({ summary: 'List waste sources (paginated)' })
  list(
    @Query() query: ListWasteSourcesQueryDto,
  ): Promise<{ data: WasteSourceDto[]; meta: PaginationMeta }> {
    return this.wasteSources.list(query);
  }

  @Get(':id')
  @RequirePermissions('waste-source:read')
  @ApiOperation({ summary: 'Get a waste source by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<WasteSourceDto> {
    return this.wasteSources.getById(id);
  }

  @Post()
  @RequirePermissions('waste-source:create')
  @ApiOperation({ summary: 'Create a waste source' })
  create(@Body() dto: CreateWasteSourceDto): Promise<WasteSourceDto> {
    return this.wasteSources.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('waste-source:update')
  @ApiOperation({ summary: 'Update a waste source' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWasteSourceDto,
  ): Promise<WasteSourceDto> {
    return this.wasteSources.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('waste-source:delete')
  @ApiOperation({ summary: 'Delete a waste source (blocked while referenced)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.wasteSources.remove(id);
  }
}
