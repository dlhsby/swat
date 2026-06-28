import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddVehicleWasteSourceDto {
  @ApiProperty()
  @IsString({ message: 'Sumber sampah wajib dipilih' })
  wasteSourceId!: string;
}
