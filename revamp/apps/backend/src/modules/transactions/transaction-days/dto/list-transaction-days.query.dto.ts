import { ApiPropertyOptional } from '@nestjs/swagger';
import { DayStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

/**
 * Query for the paginated transaction-days list (newest first). Extends the
 * shared page/limit base; the only filter is the day status.
 */
export class ListTransactionDaysQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DayStatus, description: 'Filter by day status' })
  @IsOptional()
  @IsEnum(DayStatus, { message: 'Status hari tidak valid' })
  status?: DayStatus;
}
