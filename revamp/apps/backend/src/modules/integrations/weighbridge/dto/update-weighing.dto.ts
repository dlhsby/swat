import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Patch an already-recorded weighing (parity: updatePembuanganTerverifikasi). */
export class UpdateWeighingDto {
  @ApiPropertyOptional({ description: 'Gross weight (kg)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Berat tidak boleh negatif' })
  grossWeight?: number;

  @ApiPropertyOptional({ description: 'Tare weight (kg)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Berat tidak boleh negatif' })
  tareWeight?: number;

  @ApiPropertyOptional({ description: 'Waste volume', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  wasteVolume?: number;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  cctvReference?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;

  @ApiPropertyOptional({ description: 'Mark the trip VERIFIED' })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
