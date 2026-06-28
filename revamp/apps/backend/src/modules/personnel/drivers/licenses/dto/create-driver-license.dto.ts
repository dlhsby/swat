import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateDriverLicenseDto {
  @ApiProperty()
  @IsString({ message: 'Golongan SIM wajib dipilih' })
  licenseClassId!: string;

  @ApiProperty({ maxLength: 12 })
  @IsString()
  @MinLength(1, { message: 'Nomor SIM wajib diisi' })
  @MaxLength(12)
  licenseNumber!: string;

  @ApiProperty({ example: '2028-01-01', description: 'Expiry date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  expiry!: string;
}

export class UpdateDriverLicenseDto extends PartialType(CreateDriverLicenseDto) {}
