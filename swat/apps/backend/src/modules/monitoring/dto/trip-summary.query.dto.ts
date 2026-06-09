import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Paginated trip-summary query: required date window + optional status/route filters. */
export class TripSummaryQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Inclusive start date (YYYY-MM-DD)', example: '2026-06-01' })
  @Matches(DATE_PATTERN, { message: 'dateFrom harus berformat YYYY-MM-DD.' })
  dateFrom!: string;

  @ApiProperty({ description: 'Inclusive end date (YYYY-MM-DD)', example: '2026-06-30' })
  @Matches(DATE_PATTERN, { message: 'dateTo harus berformat YYYY-MM-DD.' })
  dateTo!: string;

  @ApiPropertyOptional({ enum: TripStatus, description: 'Filter by trip status' })
  @IsOptional()
  @IsEnum(TripStatus, { message: 'status tidak valid.' })
  status?: TripStatus;

  @ApiPropertyOptional({ description: 'Filter by route id', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  routeId?: number;
}
