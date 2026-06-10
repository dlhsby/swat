import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by role id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Role id harus berupa UUID' })
  roleId?: string;

  @ApiPropertyOptional({ description: 'Search by username or name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
