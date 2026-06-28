import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A planned trip leg is described the way the legacy planner did it — pick the
 * leg category, then only the location that matters for that category — instead of
 * browsing the full route catalogue:
 *  - "Berangkat" (DEPART_POOL): pick the Pool; the leg is recorded Pool→Pool, so
 *    only `originSiteId` is supplied (no destination).
 *  - every other leg (Isi BBM / Ambil Sampah / Buang Sampah / Kembali ke Pool):
 *    the start is always the previous leg's destination, so only `destinationSiteId`
 *    is supplied and the service derives the origin from the preceding leg.
 * The service resolves (or creates) the matching Route from the resulting pair.
 * REFUEL legs additionally carry the requested fuel volume.
 */
export class CreateTripTemplateDto {
  @ApiProperty({ enum: RouteCategory, description: 'Trip category (drives the route)' })
  @IsEnum(RouteCategory, { message: 'Kategori rute tidak valid' })
  category!: RouteCategory;

  @ApiPropertyOptional({ format: 'uuid', description: 'Start location — required for DEPART_POOL' })
  @IsOptional()
  @IsString()
  @IsUUID()
  originSiteId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'End location — required for every trip except DEPART_POOL',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  destinationSiteId?: string;

  @ApiProperty({ example: '06:30', description: 'Target time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  targetTime!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Requested fuel (liters) — REFUEL trips' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Jumlah BBM tidak valid' })
  @Min(0, { message: 'Jumlah BBM tidak boleh negatif' })
  fuelRequestedLiters?: number;

  @ApiPropertyOptional({
    description: 'Default Corridor for this trip (copied to the day at init); "" clears it',
  })
  @IsOptional()
  @IsString()
  corridorId?: string;
}

export class UpdateTripTemplateDto extends PartialType(CreateTripTemplateDto) {}
