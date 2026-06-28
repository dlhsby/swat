import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';

import { CreateGpsDeviceDto } from './dto/create-gps-device.dto';
import { ListGpsDevicesQueryDto } from './dto/list-gps-devices.query.dto';
import { MapUnmatchedPingDto } from './dto/map-unmatched-ping.dto';
import { UpdateGpsDeviceDto } from './dto/update-gps-device.dto';
import { type GpsDeviceDto, GpsDeviceService, type UnmatchedPingDto } from './gps-device.service';

/**
 * GPS device registry (Phase 7, T-704). Attach/detach an IMEI↔vehicle — the only
 * join into the Vehicle master (the `Vehicle` table is never altered) — and work
 * the unmatched-IMEI queue. The literal `unmatched` routes are declared BEFORE
 * `:id` so Express matches them first.
 */
@ApiTags('gps-devices')
@Controller('gps/devices')
export class GpsDeviceController {
  constructor(private readonly devices: GpsDeviceService) {}

  @Get()
  @RequirePermissions('gps-device:read')
  @ApiOperation({ summary: 'List GPS devices (paginated)' })
  list(
    @Query() query: ListGpsDevicesQueryDto,
  ): Promise<{ data: GpsDeviceDto[]; meta: PaginationMeta }> {
    return this.devices.list(query);
  }

  @Get('unmatched')
  @RequirePermissions('gps-device:read')
  @ApiOperation({ summary: 'List unknown IMEIs parked in the unmatched-ping queue' })
  listUnmatched(
    @Query() query: ListGpsDevicesQueryDto,
  ): Promise<{ data: UnmatchedPingDto[]; meta: PaginationMeta }> {
    return this.devices.listUnmatched(query);
  }

  @Post('unmatched/map')
  @RequirePermissions('gps-device:create')
  @ApiOperation({ summary: 'Map an unmatched IMEI to a vehicle (creates a hardware device)' })
  mapUnmatched(@Body() dto: MapUnmatchedPingDto): Promise<GpsDeviceDto> {
    return this.devices.mapUnmatched(dto);
  }

  @Get(':id')
  @RequirePermissions('gps-device:read')
  @ApiOperation({ summary: 'Get a GPS device by id' })
  getById(@Param('id') id: string): Promise<GpsDeviceDto> {
    return this.devices.getById(id);
  }

  @Post()
  @RequirePermissions('gps-device:create')
  @ApiOperation({ summary: 'Register a GPS device for a vehicle' })
  create(@Body() dto: CreateGpsDeviceDto): Promise<GpsDeviceDto> {
    return this.devices.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('gps-device:update')
  @ApiOperation({ summary: 'Update / activate / reassign a GPS device' })
  update(@Param('id') id: string, @Body() dto: UpdateGpsDeviceDto): Promise<GpsDeviceDto> {
    return this.devices.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('gps-device:delete')
  @ApiOperation({ summary: 'Detach (delete) a GPS device' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.devices.remove(id);
  }
}
