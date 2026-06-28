import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Base list query: 1-indexed `page` and `limit` (max 1000). Resource-specific
 * query DTOs extend this to add filters — the global pipe rejects unknown query
 * params, so every allowed filter must be declared.
 *
 * The cap is 1000 (not 100) so the master-data lists — whose client-side table
 * and select pickers need the full dataset — can page through thousands of legacy
 * rows in a handful of requests instead of dozens.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit = 20;
}
