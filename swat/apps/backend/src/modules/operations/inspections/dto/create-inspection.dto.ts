import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { InspectionItemDto } from './inspection-item.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateInspectionDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Kendaraan wajib dipilih' })
  @Min(1, { message: 'Kendaraan wajib dipilih' })
  vehicleId!: number;

  @ApiProperty({ example: '2026-06-08', description: 'Inspection date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ minimum: 1, description: 'Inspector (user id)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inspectorId?: number;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;

  @ApiPropertyOptional({
    type: [InspectionItemDto],
    description: 'Checklist items; defaults to the 12-item template (all OK) when omitted',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items?: InspectionItemDto[];
}
