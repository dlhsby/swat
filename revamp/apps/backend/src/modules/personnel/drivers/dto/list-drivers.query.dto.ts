import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListDriversQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poolSiteId?: string;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({ description: 'Search by name or ID card number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
