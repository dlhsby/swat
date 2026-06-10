import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTripTemplateDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  routeId!: string;

  @ApiProperty({ example: '06:30', description: 'Target time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  targetTime!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Requested fuel (liters)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Jumlah BBM tidak valid' })
  @Min(0, { message: 'Jumlah BBM tidak boleh negatif' })
  fuelRequestedLiters?: number;
}

export class UpdateTripTemplateDto extends PartialType(CreateTripTemplateDto) {}
