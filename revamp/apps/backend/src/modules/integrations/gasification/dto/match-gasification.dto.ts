import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Manually link a pulled gasification entry to a specific disposal trip. */
export class MatchGasificationDto {
  @ApiProperty({ description: 'The DISPOSAL trip id to flag as gasification' })
  @IsUUID(undefined, { message: 'tripId harus berupa UUID' })
  tripId!: string;
}
