import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Create an ad-hoc (unscheduled) trip on an existing haul assignment — the
 * legacy parity for recording off-plan pickups/refuels/disposals that the daily
 * init never materialized. The route is resolved from `routeId`, or inferred
 * from `category` + `destinationSiteId`. When `actualTime` + `actualOdometer`
 * are supplied the trip is recorded (DONE) in the same call, reusing the trip
 * recording validation; otherwise it is created IN_PROGRESS for later recording.
 */
export class CreateTripDto {
  @ApiProperty({ description: 'The haul assignment this trip belongs to' })
  @IsUUID('7', { message: 'haulAssignmentId harus UUID' })
  haulAssignmentId!: string;

  @ApiPropertyOptional({ description: 'Existing route id (skip category/destination inference)' })
  @IsOptional()
  @IsUUID('7', { message: 'routeId harus UUID' })
  routeId?: string;

  @ApiPropertyOptional({
    enum: RouteCategory,
    description: 'Trip category — required when routeId is omitted (used to infer the route)',
  })
  @IsOptional()
  @IsEnum(RouteCategory, { message: 'Kategori tidak valid' })
  category?: RouteCategory;

  @ApiPropertyOptional({ description: 'Destination site — with category, infers the route' })
  @IsOptional()
  @IsUUID('7', { message: 'destinationSiteId harus UUID' })
  destinationSiteId?: string;

  @ApiPropertyOptional({ maxLength: 256, description: 'Trip label; defaults from the route' })
  @IsOptional()
  @IsString()
  @MaxLength(256, { message: 'Nama maksimal 256 karakter' })
  name?: string;

  // --- Optional realization (record the trip in the same call) ---

  @ApiPropertyOptional({
    example: '2026-06-08T06:15:00.000Z',
    description:
      'Realization timestamp (ISO-8601). With actualOdometer, records the trip immediately.',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Waktu harus berformat ISO-8601' })
  actualTime?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Odometer reading (km)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Odometer harus berupa angka' })
  @Min(0, { message: 'Odometer tidak boleh negatif' })
  actualOdometer?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'REFUEL: liters requested' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(0, { message: 'Tidak boleh negatif' })
  fuelRequestedLiters?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'REFUEL: liters approved' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(0, { message: 'Tidak boleh negatif' })
  fuelApprovedLiters?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'PICKUP/DISPOSAL: tare weight (kg)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Berat harus berupa angka' })
  @Min(0, { message: 'Berat tidak boleh negatif' })
  tareWeight?: number;

  @ApiPropertyOptional({ minimum: 1, description: 'DISPOSAL: gross weight (kg)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Berat harus berupa angka' })
  @Min(1, { message: 'Berat kotor harus lebih dari 0' })
  grossWeight?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'DISPOSAL: waste volume' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Volume harus berupa angka' })
  @Min(0, { message: 'Volume tidak boleh negatif' })
  wasteVolume?: number;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512, { message: 'Catatan maksimal 512 karakter' })
  notes?: string;
}
