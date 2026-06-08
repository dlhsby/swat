import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { MaintenanceItemDto } from './maintenance-item.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMaintenanceDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Kendaraan wajib dipilih' })
  @Min(1, { message: 'Kendaraan wajib dipilih' })
  vehicleId!: number;

  @ApiProperty({ enum: MaintenanceType, default: MaintenanceType.SERVICE })
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @ApiProperty({ example: '2026-06-08', description: 'Maintenance date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Odometer (km)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometer?: number;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  workshop?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;

  @ApiPropertyOptional({ type: [MaintenanceItemDto], description: 'Line items (totalCost = Σ)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceItemDto)
  items?: MaintenanceItemDto[];
}
