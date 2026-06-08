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

import { type DriverDto, DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ListDriversQueryDto } from './dto/list-drivers.query.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  @RequirePermissions('driver:read')
  @ApiOperation({ summary: 'List drivers (paginated)' })
  list(@Query() query: ListDriversQueryDto): Promise<{ data: DriverDto[]; meta: PaginationMeta }> {
    return this.drivers.list(query);
  }

  @Get(':id')
  @RequirePermissions('driver:read')
  @ApiOperation({ summary: 'Get a driver by id' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<DriverDto> {
    return this.drivers.getById(id);
  }

  @Post()
  @RequirePermissions('driver:create')
  @ApiOperation({ summary: 'Create a driver' })
  create(@Body() dto: CreateDriverDto): Promise<DriverDto> {
    return this.drivers.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('driver:update')
  @ApiOperation({ summary: 'Update a driver' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDriverDto): Promise<DriverDto> {
    return this.drivers.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('driver:delete')
  @ApiOperation({ summary: 'Soft-delete a driver' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.drivers.remove(id);
  }
}
