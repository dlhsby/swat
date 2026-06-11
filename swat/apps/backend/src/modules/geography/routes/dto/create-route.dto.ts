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

  // 0 is allowed: legacy routes overwhelmingly carry distance 0 (the old app did
  // not track leg distance), so the field must round-trip that on edit.
  @ApiProperty({ minimum: 0, description: 'Distance in whole km' })
  @IsInt({ message: 'Jarak harus bilangan bulat (km)' })
  @Min(0, { message: 'Jarak tidak boleh negatif' })
  distanceKm!: number;
}
