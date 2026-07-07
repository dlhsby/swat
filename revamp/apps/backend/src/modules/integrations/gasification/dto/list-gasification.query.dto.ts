import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const STATUSES = ['UNMATCHED', 'MATCHED', 'IGNORED'] as const;

/** Filter the pulled gasification entries in the review page. */
export class ListGasificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-05-07', description: 'WIB operation date, YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES, { message: 'Status tidak dikenal' })
  status?: (typeof STATUSES)[number];
}
