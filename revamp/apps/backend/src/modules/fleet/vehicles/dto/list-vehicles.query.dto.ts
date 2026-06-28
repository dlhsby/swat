import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListVehiclesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poolSiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({ description: 'Search by plate number' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  search?: string;
}
