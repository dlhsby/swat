import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ListRefuelsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filter by the vehicle model fuel' })
  @IsOptional()
  @IsString()
  fuelId?: string;

  @ApiPropertyOptional({ enum: TripStatus })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({ example: '2026-06-08', description: 'Refuels on this date' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date?: string;
}
