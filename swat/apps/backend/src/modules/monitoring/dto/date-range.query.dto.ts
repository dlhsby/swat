import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Required inclusive `YYYY-MM-DD` date window shared by the monitoring endpoints.
 *
 * `@Matches` pins the date-only shape (rejects datetimes); `@IsISO8601({strict})`
 * rejects shape-valid-but-impossible dates like `2026-13-40` or `2026-02-30`,
 * which would otherwise pass the regex and blow up downstream date parsing (500).
 */
export class DateRangeQueryDto {
  @ApiProperty({ description: 'Inclusive start date (YYYY-MM-DD)', example: '2026-06-01' })
  @Matches(DATE_PATTERN, { message: 'dateFrom harus berformat YYYY-MM-DD.' })
  @IsISO8601({ strict: true }, { message: 'dateFrom harus berupa tanggal yang valid.' })
  dateFrom!: string;

  @ApiProperty({ description: 'Inclusive end date (YYYY-MM-DD)', example: '2026-06-30' })
  @Matches(DATE_PATTERN, { message: 'dateTo harus berformat YYYY-MM-DD.' })
  @IsISO8601({ strict: true }, { message: 'dateTo harus berupa tanggal yang valid.' })
  dateTo!: string;
}
