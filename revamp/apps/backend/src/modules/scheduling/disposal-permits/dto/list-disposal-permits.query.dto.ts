import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisposalPermitStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ListDisposalPermitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ enum: DisposalPermitStatus })
  @IsOptional()
  @IsEnum(DisposalPermitStatus)
  status?: DisposalPermitStatus;

  @ApiPropertyOptional({ example: '2026-06-15', description: 'Quotas valid on this date' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  activeOn?: string;

  @ApiPropertyOptional({ description: 'Search by permit code or vehicle plate' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
