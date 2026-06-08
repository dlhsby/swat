import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateCrewScheduleDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Kendaraan wajib dipilih' })
  @Min(1, { message: 'Kendaraan wajib dipilih' })
  vehicleId!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Pengemudi wajib dipilih' })
  @Min(1, { message: 'Pengemudi wajib dipilih' })
  driverId!: number;

  @ApiProperty({ example: '05:00', description: 'Departure time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  departTime!: string;

  @ApiProperty({ example: '14:00', description: 'Return time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  returnTime!: string;
}

export class UpdateCrewScheduleDto extends PartialType(CreateCrewScheduleDto) {}

export class ListCrewSchedulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  driverId?: number;
}
