import { ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListRoutesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RouteCategory })
  @IsOptional()
  @IsEnum(RouteCategory)
  category?: RouteCategory;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originSiteId?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationSiteId?: number;
}
