import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Required inclusive `YYYY-MM-DD` date window shared by the monitoring endpoints. */
export class DateRangeQueryDto {
  @ApiProperty({ description: 'Inclusive start date (YYYY-MM-DD)', example: '2026-06-01' })
  @Matches(DATE_PATTERN, { message: 'dateFrom harus berformat YYYY-MM-DD.' })
  dateFrom!: string;

  @ApiProperty({ description: 'Inclusive end date (YYYY-MM-DD)', example: '2026-06-30' })
  @Matches(DATE_PATTERN, { message: 'dateTo harus berformat YYYY-MM-DD.' })
  dateTo!: string;
}
