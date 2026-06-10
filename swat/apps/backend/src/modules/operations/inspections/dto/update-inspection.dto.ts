import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { InspectionItemDto } from './inspection-item.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateInspectionDto {
  @ApiPropertyOptional({ example: '2026-06-08', description: 'Inspection date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ description: 'Inspector (user id)' })
  @IsOptional()
  @IsString()
  inspectorId?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;

  @ApiPropertyOptional({ type: [InspectionItemDto], description: 'Replaces all checklist items' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items?: InspectionItemDto[];
}
