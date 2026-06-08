import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AddVehicleWasteSourceDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Sumber sampah wajib dipilih' })
  @Min(1, { message: 'Sumber sampah wajib dipilih' })
  wasteSourceId!: number;
}
