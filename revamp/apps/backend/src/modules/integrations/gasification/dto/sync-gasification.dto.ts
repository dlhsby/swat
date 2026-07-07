import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Trigger a manual PTSI sync for a date (default today, WIB), optionally one plate. */
export class SyncGasificationDto {
  @ApiPropertyOptional({
    example: '2026-05-07',
    description: 'WIB date, YYYY-MM-DD (default: today)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ maxLength: 30, description: 'Narrow the pull to one plate (nopol)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nopol?: string;
}
