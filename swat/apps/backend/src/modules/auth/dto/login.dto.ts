import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(1, { message: 'Nama pengguna wajib diisi' })
  @MaxLength(100)
  username!: string;

  @ApiProperty({ example: 'Password1234!' })
  @IsString()
  @MinLength(1, { message: 'Kata sandi wajib diisi' })
  @MaxLength(200)
  password!: string;
}
