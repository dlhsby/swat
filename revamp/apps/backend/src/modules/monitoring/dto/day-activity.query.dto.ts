import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The operation date whose GPS activity feed to return for a vehicle. */
export class DayActivityQueryDto {
  @ApiProperty({ description: 'Operation date (YYYY-MM-DD)', example: '2026-07-03' })
  @Matches(DATE_PATTERN, { message: 'date harus berformat YYYY-MM-DD.' })
  date!: string;
}
