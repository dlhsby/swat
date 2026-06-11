import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateScheduleTemplateDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  driverId!: string;

  @ApiProperty({ example: '05:00', description: 'Departure time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  departTime!: string;

  @ApiProperty({ example: '14:00', description: 'Return time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  returnTime!: string;
}

export class UpdateScheduleTemplateDto extends PartialType(CreateScheduleTemplateDto) {}

export class ListScheduleTemplatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  @IsUUID()
  driverId?: string;
}
