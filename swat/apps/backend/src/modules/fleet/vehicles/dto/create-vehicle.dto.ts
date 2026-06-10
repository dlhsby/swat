import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Indonesian plate format, e.g. `L 1234 AB`. */
const PLATE_REGEX = /^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateVehicleDto {
  @ApiProperty()
  @IsString({ message: 'Pool wajib dipilih' })
  poolSiteId!: string;

  @ApiProperty()
  @IsString({ message: 'Model wajib dipilih' })
  modelId!: string;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.GOOD })
  @IsOptional()
  @IsEnum(VehicleStatus, { message: 'Status kendaraan tidak valid' })
  status?: VehicleStatus;

  @ApiProperty({ example: 'L 1234 AB', maxLength: 10 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(PLATE_REGEX, { message: 'Format nomor polisi tidak valid (contoh: L 1234 AB)' })
  plateNumber!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nomor rangka wajib diisi' })
  @MaxLength(100)
  chassisNumber!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nomor mesin wajib diisi' })
  @MaxLength(100)
  engineNumber!: string;

  @ApiPropertyOptional({ minimum: 1900, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  manufactureYear?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currentFuelRatio?: number;

  @ApiProperty({ minimum: 0, description: 'Current tare weight (kg)' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Berat kosong tidak boleh negatif' })
  currentTareWeight!: number;

  @ApiProperty({ minimum: 0, description: 'Current odometer (km)' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Odometer tidak boleh negatif' })
  currentOdometer!: number;

  @ApiProperty({ example: '2027-01-01', description: 'Registration expiry (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  registrationExpiry!: string;

  @ApiProperty({ example: '2027-01-01', description: 'Tax expiry (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  taxExpiry!: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;
}
