import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama peran wajib diisi' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Replacement set of permission ids' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true, message: 'Izin tidak valid' })
  @Min(1, { each: true })
  permissionIds?: number[];
}
