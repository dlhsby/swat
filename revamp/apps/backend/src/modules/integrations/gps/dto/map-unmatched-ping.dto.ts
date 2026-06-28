import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const IMEI_REGEX = /^[0-9]{6,20}$/;

/**
 * Map an unknown IMEI from the unmatched-ping queue to a vehicle. Creates an
 * active hardware GpsDevice and clears every queued ping for that IMEI.
 */
export class MapUnmatchedPingDto {
  @ApiProperty({ description: 'The unmatched IMEI to map' })
  @Matches(IMEI_REGEX, { message: 'IMEI harus 6–20 digit angka' })
  imei!: string;

  @ApiProperty({ format: 'uuid' })
  @IsString({ message: 'Kendaraan wajib dipilih' })
  vehicleId!: string;
}
