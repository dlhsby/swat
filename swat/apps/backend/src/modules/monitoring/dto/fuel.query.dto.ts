import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import { DateRangeQueryDto } from './date-range.query.dto';

/** Fuel-consumption query: optional single-vehicle filter. */
export class FuelConsumptionQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by a single vehicle id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Vehicle id harus berupa UUID' })
  vehicleId?: string;
}
