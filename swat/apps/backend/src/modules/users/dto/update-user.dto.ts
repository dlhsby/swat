import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role id', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Peran tidak valid' })
  @Min(1, { message: 'Peran tidak valid' })
  roleId?: number;
}
