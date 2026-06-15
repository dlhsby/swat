import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Post a weighing result. `netWeight` is NOT accepted — the server computes it as
 * `grossWeight - tareWeight`. `verified:true` marks the resulting Trip VERIFIED
 * (parity: insertPenimbanganTerverifikasi).
 */
export class PostWeighingDto {
  @ApiPropertyOptional({ description: 'Kitir (DisposalPermit) id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'kitirId harus berupa UUID' })
  kitirId?: string;

  @ApiProperty({ example: 'L-1234-AB', maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber!: string;

  @ApiProperty({ example: '2026-06-05', description: 'YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ description: 'ISO-8601 weighing timestamp' })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ApiProperty({ description: 'Gross weight (kg)', minimum: 0 })
  @IsInt()
  @Min(0, { message: 'Berat tidak boleh negatif' })
  grossWeight!: number;

  @ApiProperty({ description: 'Tare weight (kg)', minimum: 0 })
  @IsInt()
  @Min(0, { message: 'Berat tidak boleh negatif' })
  tareWeight!: number;

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

  @ApiPropertyOptional({ description: 'Mark the trip VERIFIED on success' })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
