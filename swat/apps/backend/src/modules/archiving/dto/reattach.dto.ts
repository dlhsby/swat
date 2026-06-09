import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** Identifies the archived partition to re-attach. */
export class ReattachDto {
  @ApiProperty({ description: 'Partition table name', example: 'trip_y2024m03' })
  @Matches(/^[a-z]+_y\d{4}m\d{2}$/, { message: 'tableName bukan nama partisi yang valid.' })
  tableName!: string;

  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2024-03' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'period harus berformat YYYY-MM.' })
  period!: string;
}
