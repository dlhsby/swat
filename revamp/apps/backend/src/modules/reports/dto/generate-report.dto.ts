import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { DateRangeQueryDto } from '../../monitoring/dto/date-range.query.dto';
import { REPORT_FORMATS, type ReportFormat } from '../report.types';

/**
 * Report generation request — the inclusive date window (reused from monitoring,
 * so the same validation rejects malformed/impossible dates) plus the output
 * format and the optional per-type filters. Unused filters are ignored by the
 * report type that doesn't apply them.
 */
export class GenerateReportDto extends DateRangeQueryDto {
  @ApiProperty({ enum: REPORT_FORMATS, description: 'Output format' })
  @IsIn(REPORT_FORMATS, { message: 'format harus xlsx atau pdf.' })
  format!: ReportFormat;

  @ApiPropertyOptional({ description: 'Fuel report: filter by a single vehicle (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'vehicleId harus berupa UUID.' })
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Tonnage report: filter by waste source (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'wasteSourceId harus berupa UUID.' })
  wasteSourceId?: string;

  @ApiPropertyOptional({ description: 'Tonnage report: filter by site (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'siteId harus berupa UUID.' })
  siteId?: string;

  @ApiPropertyOptional({ description: 'Fuel report: filter by fuel type (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'fuelTypeId harus berupa UUID.' })
  fuelTypeId?: string;

  @ApiPropertyOptional({ description: 'Levy report: filter by category (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'categoryId harus berupa UUID.' })
  categoryId?: string;
}
