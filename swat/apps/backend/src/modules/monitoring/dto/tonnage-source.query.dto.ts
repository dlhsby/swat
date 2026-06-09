import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { DateRangeQueryDto } from './date-range.query.dto';

/** Source-group values for the legacy Semua / Non-Swasta / Swasta tonnage filter. */
export const SOURCE_GROUPS = ['NON_SWASTA', 'SWASTA'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];

/**
 * Tonnage-by-source query. The Semua / Non-Swasta / Swasta toggle maps to `group`:
 * omit for Semua (all six sources), `SWASTA` for the private source (code `S`),
 * `NON_SWASTA` for the rest — derived from `WasteSource.code`, no stored flag.
 */
export class TonnageBySourceQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    enum: SOURCE_GROUPS,
    description:
      "Filter by source group (omit for Semua). SWASTA = code 'S'; NON_SWASTA = the rest.",
  })
  @IsOptional()
  @IsIn(SOURCE_GROUPS, { message: 'group harus NON_SWASTA atau SWASTA.' })
  group?: SourceGroup;
}
