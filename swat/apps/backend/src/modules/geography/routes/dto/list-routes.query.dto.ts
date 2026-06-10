import { ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { IsEnum, IsString, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListRoutesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RouteCategory })
  @IsOptional()
  @IsEnum(RouteCategory)
  category?: RouteCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originSiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationSiteId?: string;
}
