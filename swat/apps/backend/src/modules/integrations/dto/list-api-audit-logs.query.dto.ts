import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListApiAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by endpoint substring' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Filter by HTTP status code' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusCode?: number;

  @ApiPropertyOptional({ description: 'Filter by principal id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'principalId harus berupa UUID' })
  principalId?: string;

  @ApiPropertyOptional({ description: 'From timestamp (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'To timestamp (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
