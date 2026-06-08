import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelQuotaStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateFuelQuotaDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Kitir code (auto/blank if omitted)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Kendaraan wajib dipilih' })
  @Min(1, { message: 'Kendaraan wajib dipilih' })
  vehicleId!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Lokasi wajib dipilih' })
  @Min(1, { message: 'Lokasi wajib dipilih' })
  siteId!: number;

  @ApiProperty({ example: '2026-06-01', description: 'Issued date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  issuedAt!: string;

  @ApiProperty({ example: '2026-06-01', description: 'Valid from (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validFrom!: string;

  @ApiProperty({ example: '2026-06-30', description: 'Valid to (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validTo!: string;

  @ApiPropertyOptional({ enum: FuelQuotaStatus, default: FuelQuotaStatus.ACTIVE })
  @IsOptional()
  @IsEnum(FuelQuotaStatus)
  status?: FuelQuotaStatus;
}
