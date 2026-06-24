import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Filter by route id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Route id harus berupa UUID' })
  routeId?: string;

  @ApiPropertyOptional({ description: 'Filter by vehicle id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Vehicle id harus berupa UUID' })
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filter by driver id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Driver id harus berupa UUID' })
  driverId?: string;
}
