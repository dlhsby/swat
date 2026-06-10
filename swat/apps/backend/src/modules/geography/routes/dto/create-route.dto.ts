import { ApiProperty } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { IsEnum, IsString, IsInt, Min } from 'class-validator';

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

  @ApiProperty({ minimum: 0, description: 'Distance in km' })
  @IsInt()
  @Min(0.1, { message: 'Jarak harus lebih dari nol' })
  distanceKm!: number;
}
