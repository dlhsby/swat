import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SiteType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ enum: SiteType })
  @IsEnum(SiteType, { message: 'Jenis lokasi tidak valid' })
  type!: SiteType;

  @ApiProperty({ maxLength: 256 })
  @IsString()
  @MinLength(1, { message: 'Nama lokasi wajib diisi' })
  @MaxLength(256)
  name!: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  address?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90, { message: 'Lintang harus antara -90 dan 90' })
  @Max(90, { message: 'Lintang harus antara -90 dan 90' })
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180, { message: 'Bujur harus antara -180 dan 180' })
  @Max(180, { message: 'Bujur harus antara -180 dan 180' })
  longitude?: number;
}
