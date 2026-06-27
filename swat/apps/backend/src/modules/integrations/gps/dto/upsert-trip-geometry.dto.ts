import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

/** Per-day corridor override for a single trip (T-709). */
export class UpsertTripGeometryDto {
  @ApiProperty({ description: 'GeoJSON LineString overriding the route template for this day' })
  @IsObject({ message: 'Geometri harus berupa objek GeoJSON LineString.' })
  pathGeojson!: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 10, maximum: 2000, description: 'Buffer width (m) for this day' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(2000)
  toleranceMeters?: number;

  @ApiPropertyOptional({
    description: 'Editor control points the override path was built from: [{ lng, lat, snapped }].',
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  @IsArray({ message: 'Waypoints harus berupa daftar titik.' })
  waypoints?: Array<Record<string, unknown>>;
}
