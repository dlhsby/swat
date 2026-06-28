import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** List query for levy records: pagination + category / date-range filters. */
export class ListLevyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category (contains, case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoryName?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Inclusive end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  dateTo?: string;
}
