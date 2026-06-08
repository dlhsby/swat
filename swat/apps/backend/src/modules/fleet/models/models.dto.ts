import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateVehicleModelDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Aplikasi kendaraan wajib dipilih' })
  @Min(1, { message: 'Aplikasi kendaraan wajib dipilih' })
  applicationId!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Bahan bakar wajib dipilih' })
  @Min(1, { message: 'Bahan bakar wajib dipilih' })
  fuelId!: number;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Merek wajib diisi' })
  @MaxLength(100)
  brand!: string;

  @ApiProperty({ minimum: 1, description: 'Fuel tank capacity (liters)' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Kapasitas tangki harus lebih dari 0' })
  fuelTankCapacity!: number;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  normalFuelRatio?: number;

  @ApiProperty({ minimum: 1, description: 'Normal tare weight (kg)' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Berat kosong harus lebih dari 0' })
  normalTareWeight!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxNetLoad?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxNetVolume?: number;

  @ApiProperty({ minimum: 1, description: 'Wheel count' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Jumlah roda harus lebih dari 0' })
  wheelCount!: number;
}

export class UpdateVehicleModelDto extends PartialType(CreateVehicleModelDto) {}

export class ListVehicleModelsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  applicationId?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fuelId?: number;

  @ApiPropertyOptional({ description: 'Search by brand' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
