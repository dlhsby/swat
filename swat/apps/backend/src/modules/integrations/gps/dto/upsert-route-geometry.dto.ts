import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Upsert a route's corridor template (T-709). `pathGeojson` is a GeoJSON
 * LineString — its shape is validated in the service (assertLineString) and by
 * PostGIS, so here it is just required to be an object.
 */
export class UpsertRouteGeometryDto {
  @ApiProperty({ description: 'GeoJSON LineString { type, coordinates: [[lng,lat], …] }' })
  @IsObject({ message: 'Geometri harus berupa objek GeoJSON LineString.' })
  pathGeojson!: Record<string, unknown>;

  @ApiPropertyOptional({
    minimum: 10,
    maximum: 2000,
    default: 150,
    description: 'Buffer width (m)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(2000)
  toleranceMeters?: number;

  @ApiPropertyOptional({ default: 'google-maps', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;
}
