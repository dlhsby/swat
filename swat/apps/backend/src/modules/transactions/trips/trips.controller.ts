import { Body, Controller, Delete, Get, Param, Post, Put, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../../common/auth/session.types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CacheInvalidationInterceptor } from '../../../common/interceptors/cache-invalidation.interceptor';

import { AttachTripPhotoDto } from './dto/attach-trip-photo.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { RecordTripDto } from './dto/record-trip.dto';
import { type TripPhotoDto, TripPhotosService } from './trip-photos.service';
import { type TripDto } from './trip.mapper';
import { type TripDetailDto, TripsService } from './trips.service';

// Recording/verifying a trip changes the rollups, so clear the monitoring cache.
@ApiTags('trips')
@Controller('trips')
@UseInterceptors(CacheInvalidationInterceptor)
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly tripPhotos: TripPhotosService,
  ) {}

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

  @Delete(':id')
  @ApiOperation({
    summary:
      'Un-record a trip realization (soft delete on the recap): reverts it to IN_PROGRESS and clears the entered values, keeping the scheduled slot. The required permission depends on the route category; a verified trip needs trip:override. Enforced server-side.',
  })
  unrecord(@Param('id') id: string, @CurrentUser() user: SessionUser): Promise<TripDto> {
    return this.trips.unrecord(id, user);
  }

  @Put(':id/verify')
  @RequirePermissions('trip:verify')
  @ApiOperation({ summary: 'Verify a recorded trip (locks it against further edits)' })
  verify(@Param('id') id: string, @CurrentUser() user: SessionUser): Promise<TripDto> {
    return this.trips.verify(id, user);
  }

  @Get(':id/photos')
  @RequirePermissions('trip:read')
  @ApiOperation({ summary: 'List a trip’s photos with short-lived view URLs' })
  listPhotos(@Param('id') id: string): Promise<TripPhotoDto[]> {
    return this.tripPhotos.list(id);
  }

  @Post(':id/photos')
  @RequirePermissions('trip:update')
  @ApiOperation({
    summary:
      'Attach a photo to a trip (legacy dokumentasitrayek). Upload the bytes via /storage/presigned-put first, then register the object metadata here.',
  })
  attachPhoto(@Param('id') id: string, @Body() dto: AttachTripPhotoDto): Promise<TripPhotoDto> {
    return this.tripPhotos.attach(id, dto);
  }
}
