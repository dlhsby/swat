import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { IsEnum, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ enum: RouteCategory })
  @IsEnum(RouteCategory, { message: 'Kategori rute tidak valid' })
  category!: RouteCategory;

  @ApiProperty()
  @IsString({ message: 'Lokasi asal wajib dipilih' })
  originSiteId!: string;

  @ApiProperty()
  @IsString({ message: 'Lokasi tujuan wajib dipilih' })
  destinationSiteId!: string;

  // Distance is derived from the route's default corridor length (ST_Length); the
  // service overrides whatever is sent. Optional + accepted only so legacy clients
  // and the resolve-or-create path can still pass a seed value (0).
  @ApiPropertyOptional({ minimum: 0, description: 'Derived from the default corridor; optional' })
  @IsOptional()
  @IsInt({ message: 'Jarak harus bilangan bulat (km)' })
  @Min(0, { message: 'Jarak tidak boleh negatif' })
  distanceKm?: number;
}
