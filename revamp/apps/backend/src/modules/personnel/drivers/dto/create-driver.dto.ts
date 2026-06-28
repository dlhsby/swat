import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateDriverDto {
  @ApiProperty()
  @IsString({ message: 'Pool wajib dipilih' })
  poolSiteId!: string;

  @ApiProperty({ enum: EmploymentStatus })
  @IsEnum(EmploymentStatus, { message: 'Status kepegawaian tidak valid' })
  employmentStatus!: EmploymentStatus;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: '16-digit national ID (KTP)' })
  @IsString()
  @Matches(/^\d{16}$/, { message: 'Nomor KTP harus 16 digit angka' })
  idCardNumber!: string;

  @ApiProperty({ maxLength: 256 })
  @IsString()
  @MinLength(1, { message: 'Alamat asal wajib diisi' })
  @MaxLength(256)
  originAddress!: string;

  @ApiProperty({ maxLength: 256 })
  @IsString()
  @MinLength(1, { message: 'Alamat saat ini wajib diisi' })
  @MaxLength(256)
  currentAddress!: string;

  @ApiProperty({ example: '1990-01-01', description: 'Birth date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  birthDate!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Kontak wajib diisi' })
  @MaxLength(100)
  contact!: string;

  @ApiPropertyOptional({ maxLength: 100, default: 'BELUM' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  safetyTraining?: string;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  notes?: string;
}
