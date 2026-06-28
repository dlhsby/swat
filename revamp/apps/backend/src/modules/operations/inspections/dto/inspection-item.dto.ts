import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionItemStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class InspectionItemDto {
  @ApiProperty({ maxLength: 128, example: 'Rem' })
  @IsString({ message: 'Label item wajib diisi' })
  @MaxLength(128)
  label!: string;

  @ApiProperty({ enum: InspectionItemStatus, default: InspectionItemStatus.OK })
  @IsEnum(InspectionItemStatus)
  status!: InspectionItemStatus;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  notes?: string;
}
