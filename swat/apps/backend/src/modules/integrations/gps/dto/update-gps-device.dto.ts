import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { GPS_DEVICE_TYPES } from './create-gps-device.dto';

const IMEI_REGEX = /^[0-9]{6,20}$/;

/** All fields optional — a PATCH updates only what's supplied. */
export class UpdateGpsDeviceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: GPS_DEVICE_TYPES })
  @IsOptional()
  @IsIn(GPS_DEVICE_TYPES, { message: 'Jenis perangkat tidak valid' })
  deviceType?: (typeof GPS_DEVICE_TYPES)[number];

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceId?: string;

  @ApiPropertyOptional({ description: 'IMEI (6–20 digits)' })
  @IsOptional()
  @Matches(IMEI_REGEX, { message: 'IMEI harus 6–20 digit angka' })
  imei?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  provider?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
