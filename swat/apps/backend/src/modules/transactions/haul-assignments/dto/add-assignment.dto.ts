import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Add a driver-shift to an existing vehicle's haul (Phase 7.8, T-729). */
export class AddAssignmentDto {
  @ApiProperty({ description: "The vehicle's haul for the day" })
  @IsString()
  haulId!: string;

  @ApiProperty({ description: 'Driver for this shift' })
  @IsString()
  driverId!: string;

  @ApiPropertyOptional({ example: '07:00', description: 'Target depart time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  departTime?: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Target return time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  returnTime?: string;
}

/** Add a vehicle (new haul + first shift) to an existing transaction day. */
export class AddHaulDto {
  @ApiProperty()
  @IsString()
  transactionDayId!: string;

  @ApiProperty()
  @IsString()
  vehicleId!: string;

  @ApiProperty()
  @IsString()
  driverId!: string;

  @ApiPropertyOptional({ example: '07:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  departTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'Waktu harus berformat HH:mm' })
  returnTime?: string;
}
