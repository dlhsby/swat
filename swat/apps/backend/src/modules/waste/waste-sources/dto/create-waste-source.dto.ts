import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWasteSourceDto {
  @ApiProperty({ maxLength: 5, description: 'Short code, e.g. "PS"' })
  @IsString()
  @MinLength(1, { message: 'Kode wajib diisi' })
  @MaxLength(5, { message: 'Kode maksimal 5 karakter' })
  code!: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  notes?: string;
}
