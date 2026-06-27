import { ApiPropertyOptional } from '@nestjs/swagger';
import { RouteCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

/** Filter the corridor library by leg (origin/destination/category) or name. */
export class ListCorridorsQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Case-insensitive match on corridor name' })
  @IsOptional()
  @IsString()
  search?: string;
}
