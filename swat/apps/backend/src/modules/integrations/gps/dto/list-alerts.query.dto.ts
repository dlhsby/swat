import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const toBool = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListAlertsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filter by acknowledged state' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  acknowledged?: boolean;

  @ApiPropertyOptional({ description: 'Filter by resolved state (false = still open)' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ description: 'ISO date-time lower bound (createdAt)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date-time upper bound (createdAt)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
