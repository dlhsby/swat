import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateVehicleModelDto {
  @ApiProperty()
  @IsString({ message: 'Aplikasi kendaraan wajib dipilih' })
  vehicleTypeId!: string;

  @ApiProperty()
  @IsString({ message: 'Bahan bakar wajib dipilih' })
  fuelId!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Merek wajib diisi' })
  @MaxLength(100)
  brand!: string;

  // Minimums mirror the legacy `kategorikendaraan` structure: the NOT-NULL
  // numeric columns legitimately hold 0 in legacy data (allow 0, not 1); the two
  // nullable columns carry no minimum and may be omitted.
  @ApiProperty({ minimum: 0, description: 'Fuel tank capacity (liters)' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Kapasitas tangki tidak boleh negatif' })
  fuelTankCapacity!: number;

  @ApiPropertyOptional({ minimum: 0, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Rasio tidak boleh negatif' })
  normalFuelRatio?: number;

  @ApiProperty({ minimum: 0, description: 'Normal tare weight (kg)' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Berat kosong tidak boleh negatif' })
  normalTareWeight!: number;

  @ApiPropertyOptional({ description: 'Max net load (kg); nullable in legacy' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxNetLoad?: number;

  @ApiPropertyOptional({ description: 'Max net volume (m³); nullable in legacy' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxNetVolume?: number;

  @ApiProperty({ minimum: 0, description: 'Wheel count' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Jumlah roda tidak boleh negatif' })
  wheelCount!: number;
}

export class UpdateVehicleModelDto extends PartialType(CreateVehicleModelDto) {}

export class ListVehicleModelsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fuelId?: string;

  @ApiPropertyOptional({ description: 'Search by brand' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
