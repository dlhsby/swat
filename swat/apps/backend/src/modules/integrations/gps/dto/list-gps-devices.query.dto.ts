import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export const GPS_DEVICE_STATUSES = ['online', 'offline'] as const;

export class ListGpsDevicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by vehicle' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: GPS_DEVICE_STATUSES })
  @IsOptional()
  @IsIn(GPS_DEVICE_STATUSES)
  status?: (typeof GPS_DEVICE_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Filter by active flag' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Search by device id / IMEI' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
