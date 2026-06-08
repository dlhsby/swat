import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * One payload shape for every trip type. The category-specific fields are
 * optional here and validated against the trip's route category server-side
 * (REFUEL needs fuel, DISPOSAL needs weighing). `netWeight` is never accepted
 * from the client — it is always computed as `grossWeight − tareWeight`.
 */
export class RecordTripDto {
  @ApiProperty({
    example: '2026-06-08T06:15:00.000Z',
    description: 'Realization timestamp (ISO-8601)',
  })
  @IsISO8601({ strict: true }, { message: 'Waktu harus berformat ISO-8601' })
  actualTime!: string;

  @ApiProperty({ minimum: 0, description: 'Odometer reading (km)' })
  @Type(() => Number)
  @IsInt({ message: 'Odometer harus berupa angka' })
  @Min(0, { message: 'Odometer tidak boleh negatif' })
  actualOdometer!: number;

  @ApiPropertyOptional({ minimum: 0, description: 'REFUEL: liters requested' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(0, { message: 'Tidak boleh negatif' })
  fuelRequestedLiters?: number;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'REFUEL: liters approved (needs fuel:approve to exceed requested)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(0, { message: 'Tidak boleh negatif' })
  fuelApprovedLiters?: number;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'PICKUP/DISPOSAL: tare weight (kg); defaults to the vehicle tare',
  })
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
