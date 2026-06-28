import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class MaintenanceItemDto {
  @ApiProperty({ maxLength: 256, example: 'Ganti oli mesin' })
  @IsString({ message: 'Nama item wajib diisi' })
  @MaxLength(256)
  name!: string;

  @ApiProperty({ minimum: 0, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qty!: number;

  @ApiProperty({ minimum: 0, example: 75000, description: 'Unit price (IDR)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice!: number;
}
