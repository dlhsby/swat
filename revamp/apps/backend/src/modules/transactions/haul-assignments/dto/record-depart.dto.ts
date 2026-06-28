import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, Min } from 'class-validator';

export class RecordDepartDto {
  @ApiProperty({ minimum: 0, description: 'Odometer reading at departure (km)' })
  @Type(() => Number)
  @IsInt({ message: 'Odometer harus berupa angka' })
  @Min(0, { message: 'Odometer tidak boleh negatif' })
  actualOdometer!: number;

  @ApiProperty({
    example: '2026-06-08T05:30:00.000Z',
    description: 'Departure timestamp (ISO-8601)',
  })
  @IsISO8601({ strict: true }, { message: 'Waktu harus berformat ISO-8601' })
  actualTime!: string;
}
