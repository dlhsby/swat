import { ApiProperty } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ enum: RouteCategory })
  @IsEnum(RouteCategory, { message: 'Kategori rute tidak valid' })
  category!: RouteCategory;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Lokasi asal wajib dipilih' })
  @Min(1, { message: 'Lokasi asal wajib dipilih' })
  originSiteId!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Lokasi tujuan wajib dipilih' })
  @Min(1, { message: 'Lokasi tujuan wajib dipilih' })
  destinationSiteId!: number;

  @ApiProperty({ minimum: 0, description: 'Distance in km' })
  @Type(() => Number)
  @IsInt()
  @Min(0.1, { message: 'Jarak harus lebih dari nol' })
  distanceKm!: number;
}
