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

import { CreateFuelDto, ListFuelsQueryDto, UpdateFuelDto } from './fuels.dto';
import { type FuelDto, FuelsService } from './fuels.service';

@ApiTags('fuels')
@Controller('fuels')
export class FuelsController {
  constructor(private readonly fuels: FuelsService) {}

  @Get()
  @RequirePermissions('fuel:read')
  @ApiOperation({ summary: 'List fuels (paginated)' })
  list(@Query() query: ListFuelsQueryDto): Promise<{ data: FuelDto[]; meta: PaginationMeta }> {
    return this.fuels.list(query);
  }

  @Get(':id')
  @RequirePermissions('fuel:read')
  @ApiOperation({ summary: 'Get a fuel by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<FuelDto> {
    return this.fuels.getById(id);
  }

  @Post()
  @RequirePermissions('fuel:create')
  @ApiOperation({ summary: 'Create a fuel' })
  create(@Body() dto: CreateFuelDto): Promise<FuelDto> {
    return this.fuels.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('fuel:update')
  @ApiOperation({ summary: 'Update a fuel (incl. price per liter)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFuelDto): Promise<FuelDto> {
    return this.fuels.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('fuel:delete')
  @ApiOperation({ summary: 'Delete a fuel (blocked while referenced)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.fuels.remove(id);
  }
}
