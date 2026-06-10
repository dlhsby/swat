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

  @ApiProperty({ minimum: 1, description: 'Distance in whole km' })
  @IsInt({ message: 'Jarak harus bilangan bulat (km)' })
  @Min(1, { message: 'Jarak minimal 1 km' })
  distanceKm!: number;
}
