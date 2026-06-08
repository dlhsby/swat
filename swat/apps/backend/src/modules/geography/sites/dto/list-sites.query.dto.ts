import { ApiPropertyOptional } from '@nestjs/swagger';
import { SiteType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListSitesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SiteType })
  @IsOptional()
  @IsEnum(SiteType)
  type?: SiteType;

  @ApiPropertyOptional({ description: 'Search by name or address' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  search?: string;
}
