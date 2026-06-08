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

import {
  CreateFuelCategoryDto,
  ListFuelCategoriesQueryDto,
  UpdateFuelCategoryDto,
} from './fuel-categories.dto';
import { type FuelCategoryDto, FuelCategoriesService } from './fuel-categories.service';

@ApiTags('fuel-categories')
@Controller('fuel-categories')
export class FuelCategoriesController {
  constructor(private readonly fuelCategories: FuelCategoriesService) {}

  @Get()
  @RequirePermissions('fuel-category:read')
  @ApiOperation({ summary: 'List fuel categories (paginated)' })
  list(
    @Query() query: ListFuelCategoriesQueryDto,
  ): Promise<{ data: FuelCategoryDto[]; meta: PaginationMeta }> {
    return this.fuelCategories.list(query);
  }

  @Get(':id')
  @RequirePermissions('fuel-category:read')
  @ApiOperation({ summary: 'Get a fuel category by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<FuelCategoryDto> {
    return this.fuelCategories.getById(id);
  }

  @Post()
  @RequirePermissions('fuel-category:create')
  @ApiOperation({ summary: 'Create a fuel category' })
  create(@Body() dto: CreateFuelCategoryDto): Promise<FuelCategoryDto> {
    return this.fuelCategories.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('fuel-category:update')
  @ApiOperation({ summary: 'Update a fuel category' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuelCategoryDto,
  ): Promise<FuelCategoryDto> {
    return this.fuelCategories.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('fuel-category:delete')
  @ApiOperation({ summary: 'Delete a fuel category (blocked while referenced)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.fuelCategories.remove(id);
  }
}
