import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
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
 * Create a corridor under a route (Phase 7.8). `pathGeojson` is a GeoJSON
 * LineString validated in the service + by PostGIS. The corridor belongs to the
 * route in the URL; its endpoints are anchored to the route's two Sites.
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

  @ApiPropertyOptional({ maxLength: 20, default: 'google-maps' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;
}
