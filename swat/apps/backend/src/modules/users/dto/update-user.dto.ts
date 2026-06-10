import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Peran tidak valid' })
  roleId?: string;
}
