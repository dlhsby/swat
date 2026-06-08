import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../../common/decorators/require-permissions.decorator';

import { type DriverLicenseDto, DriverLicensesService } from './driver-licenses.service';
import { CreateDriverLicenseDto, UpdateDriverLicenseDto } from './dto/create-driver-license.dto';

@ApiTags('driver-licenses')
@Controller('drivers/:driverId/licenses')
export class DriverLicensesController {
  constructor(private readonly licenses: DriverLicensesService) {}

  @Get()
  @RequirePermissions('license:read')
  @ApiOperation({ summary: 'List a driver’s licenses' })
  list(@Param('driverId', ParseIntPipe) driverId: number): Promise<DriverLicenseDto[]> {
    return this.licenses.list(driverId);
  }

  @Post()
  @RequirePermissions('license:create')
  @ApiOperation({ summary: 'Add a license to a driver' })
  create(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body() dto: CreateDriverLicenseDto,
  ): Promise<DriverLicenseDto> {
    return this.licenses.create(driverId, dto);
  }

  @Patch(':licenseId')
  @RequirePermissions('license:update')
  @ApiOperation({ summary: 'Update a driver license' })
  update(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('licenseId', ParseIntPipe) licenseId: number,
    @Body() dto: UpdateDriverLicenseDto,
  ): Promise<DriverLicenseDto> {
    return this.licenses.update(driverId, licenseId, dto);
  }

  @Delete(':licenseId')
  @RequirePermissions('license:delete')
  @ApiOperation({ summary: 'Delete a driver license' })
  remove(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('licenseId', ParseIntPipe) licenseId: number,
  ): Promise<{ message: string }> {
    return this.licenses.remove(driverId, licenseId);
  }
}
