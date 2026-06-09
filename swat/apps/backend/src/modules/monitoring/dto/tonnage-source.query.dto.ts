import { ApiPropertyOptional } from '@nestjs/swagger';
import { WasteSourceOwnership } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { DateRangeQueryDto } from './date-range.query.dto';

/** Tonnage-by-source query: the Total/Dinas/Swasta toggle maps to `ownership`. */
export class TonnageBySourceQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    enum: WasteSourceOwnership,
    description: 'Filter by ownership (omit for Total)',
  })
  @IsOptional()
  @IsEnum(WasteSourceOwnership, { message: 'ownership harus DINAS atau SWASTA.' })
  ownership?: WasteSourceOwnership;
}
