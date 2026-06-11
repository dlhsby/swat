import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A planned trip leg is described the way the legacy planner did it — pick the
 * leg category, then its start and end location — instead of browsing the full
 * route catalogue. The service resolves (or creates) the matching Route from this
 * triple. REFUEL legs additionally carry the requested fuel volume.
 */
export class CreateTripTemplateDto {
  @ApiProperty({ enum: RouteCategory, description: 'Leg category (drives the route)' })
  @IsEnum(RouteCategory, { message: 'Kategori trayek tidak valid' })
  category!: RouteCategory;

  @ApiProperty({ format: 'uuid', description: 'Start location' })
  @IsString()
  @IsUUID()
  originSiteId!: string;

  @ApiProperty({ format: 'uuid', description: 'End location' })
  @IsString()
  @IsUUID()
  destinationSiteId!: string;

  @ApiProperty({ example: '06:30', description: 'Target time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  targetTime!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Requested fuel (liters) — REFUEL legs' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Jumlah BBM tidak valid' })
  @Min(0, { message: 'Jumlah BBM tidak boleh negatif' })
  fuelRequestedLiters?: number;
}

export class UpdateTripTemplateDto extends PartialType(CreateTripTemplateDto) {}
