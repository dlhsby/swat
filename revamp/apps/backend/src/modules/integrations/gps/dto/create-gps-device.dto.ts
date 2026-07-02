import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

/** Two known device kinds today; the column is an open string for future sources. */
export const GPS_DEVICE_TYPES = ['gps-hardware', 'mobile-app'] as const;
const IMEI_REGEX = /^[0-9]{6,20}$/;

export class CreateGpsDeviceDto {
  @ApiProperty({ format: 'uuid' })
  @IsString({ message: 'Kendaraan wajib dipilih' })
  vehicleId!: string;

  @ApiPropertyOptional({ enum: GPS_DEVICE_TYPES, default: 'gps-hardware' })
  @IsOptional()
  @IsIn(GPS_DEVICE_TYPES, { message: 'Jenis perangkat tidak valid' })
  deviceType?: (typeof GPS_DEVICE_TYPES)[number];

  @ApiProperty({ maxLength: 64, description: 'Device id — the IMEI for GPS.id hardware' })
  @IsString()
  @MaxLength(64)
  deviceId!: string;

  @ApiPropertyOptional({ description: 'IMEI (6–20 digits); defaults to deviceId for hardware' })
  @IsOptional()
  @Matches(IMEI_REGEX, { message: 'IMEI harus 6–20 digit angka' })
  imei?: string;

  @ApiPropertyOptional({ default: 'gpsid', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  provider?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ default: true, description: 'Whether the device is active on creation' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
