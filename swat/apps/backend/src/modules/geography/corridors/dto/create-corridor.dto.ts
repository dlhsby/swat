import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Create a named corridor (Phase 7.8, T-725). `pathGeojson` is a GeoJSON
 * LineString validated in the service (assertLineString) and by PostGIS. Endpoint
 * fields are optional metadata for filtering the library — NOT a unique key.
 * Site IDs use `@IsString` (project convention: UUID v7 isn't matched by IsUUID).
 */
export class CreateCorridorDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1, { message: 'Nama koridor wajib diisi' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'GeoJSON LineString { type, coordinates: [[lng,lat], …] }' })
  @IsObject({ message: 'Geometri harus berupa objek GeoJSON LineString.' })
  pathGeojson!: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray({ message: 'Waypoints harus berupa daftar titik.' })
  waypoints?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ minimum: 10, maximum: 2000, default: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(2000)
  toleranceMeters?: number;

  @ApiPropertyOptional({ enum: RouteCategory, description: 'Leg metadata (filtering only)' })
  @IsOptional()
  @IsEnum(RouteCategory, { message: 'Kategori tidak valid' })
  category?: RouteCategory;

  @ApiPropertyOptional({ description: 'Origin Site (metadata only)' })
  @IsOptional()
  @IsString()
  originSiteId?: string;

  @ApiPropertyOptional({ description: 'Destination Site (metadata only)' })
  @IsOptional()
  @IsString()
  destinationSiteId?: string;

  @ApiPropertyOptional({ maxLength: 20, default: 'google-maps' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;
}
