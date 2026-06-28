import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Create a levy (retribusi) record. `amount` is integer IDR. */
export class CreateLevyDto {
  @ApiProperty({ maxLength: 100, example: 'Rumah Tangga' })
  @IsString()
  @MaxLength(100)
  categoryName!: string;

  @ApiProperty({ example: '2026-06-01', description: 'Levy date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: 15_000_000, description: 'Amount in IDR (integer)' })
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  notes?: string;
}
