import { Body, Controller, Get, Param, Post, Put, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CacheInvalidationInterceptor } from '../../../common/interceptors/cache-invalidation.interceptor';

import { CreateTripDto } from './dto/create-trip.dto';
import { RecordTripDto } from './dto/record-trip.dto';
import { type TripDto } from './trip.mapper';
import { type TripDetailDto, TripsService } from './trips.service';

// Recording/verifying a trip changes the rollups, so clear the monitoring cache.
@ApiTags('trips')
@Controller('trips')
@UseInterceptors(CacheInvalidationInterceptor)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  @RequirePermissions('trip:create')
  @ApiOperation({
    summary:
      'Create an ad-hoc (unscheduled) trip on a haul assignment. Optionally records it (DONE) when actualTime + actualOdometer are supplied; recording then also needs the category record permission.',
  })
  create(@Body() dto: CreateTripDto, @CurrentUser() user: SessionUser): Promise<TripDto> {
    return this.trips.create(dto, user);
  }

  @Get(':id')
  @RequirePermissions('trip:read')
  @ApiOperation({ summary: 'Get a trip with its assignment, haul, and transaction day' })
  getById(@Param('id') id: string): Promise<TripDetailDto> {
    return this.trips.getById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary:
      'Record a trip realization. The required permission depends on the route category (record-fuel/pickup/disposal); enforced server-side.',
  })
  record(
    @Param('id') id: string,
    @Body() dto: RecordTripDto,
    @CurrentUser() user: SessionUser,
  ): Promise<TripDto> {
    return this.trips.record(id, dto, user);
  }

  @Put(':id/verify')
  @RequirePermissions('trip:verify')
  @ApiOperation({ summary: 'Verify a recorded trip (locks it against further edits)' })
  verify(@Param('id') id: string, @CurrentUser() user: SessionUser): Promise<TripDto> {
    return this.trips.verify(id, user);
  }
}
