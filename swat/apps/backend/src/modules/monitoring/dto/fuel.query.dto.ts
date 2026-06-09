import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

import { DateRangeQueryDto } from './date-range.query.dto';

/** Fuel-consumption query: optional single-vehicle filter. */
export class FuelConsumptionQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by a single vehicle id', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId?: number;
}
