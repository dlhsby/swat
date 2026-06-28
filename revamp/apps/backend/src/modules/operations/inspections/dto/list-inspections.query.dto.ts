import { ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionResult } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ListInspectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: InspectionResult })
  @IsOptional()
  @IsEnum(InspectionResult)
  result?: InspectionResult;

  @ApiPropertyOptional({ example: '2026-06-08', description: 'Inspections on this date' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date?: string;
}
