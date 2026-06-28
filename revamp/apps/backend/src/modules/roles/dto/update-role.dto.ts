import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama peran wajib diisi' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: [String], description: 'Replacement set of permission ids' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true, message: 'Izin tidak valid' })
  permissionIds?: string[];
}
