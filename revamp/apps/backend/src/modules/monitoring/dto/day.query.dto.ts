import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A single required `YYYY-MM-DD` operation day, shared by the day-scoped dashboard
 * reads (day stats, site day-summary). Same date-only guard as
 * {@link DateRangeQueryDto} so impossible calendar dates are rejected (422 not 500).
 */
export class DayQueryDto {
  @ApiProperty({ description: 'Operation date (YYYY-MM-DD)', example: '2026-07-01' })
  @Matches(DATE_PATTERN, { message: 'date harus berformat YYYY-MM-DD.' })
  @IsISO8601({ strict: true }, { message: 'date harus berupa tanggal yang valid.' })
  date!: string;
}
