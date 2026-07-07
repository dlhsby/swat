import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Paginated BBM detail query: required date window (per-refuel-event rows). */
export class FuelDetailQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Inclusive start date (YYYY-MM-DD)', example: '2026-07-01' })
  @Matches(DATE_PATTERN, { message: 'dateFrom harus berformat YYYY-MM-DD.' })
  dateFrom!: string;

  @ApiProperty({ description: 'Inclusive end date (YYYY-MM-DD)', example: '2026-07-31' })
  @Matches(DATE_PATTERN, { message: 'dateTo harus berformat YYYY-MM-DD.' })
  dateTo!: string;
}
