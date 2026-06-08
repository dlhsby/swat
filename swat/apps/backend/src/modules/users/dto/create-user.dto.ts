import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3, { message: 'Nama pengguna minimal 3 karakter' })
  @MaxLength(100, { message: 'Nama pengguna maksimal 100 karakter' })
  username!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Role id', minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Peran wajib dipilih' })
  @Min(1, { message: 'Peran wajib dipilih' })
  roleId!: number;
}
