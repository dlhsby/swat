import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateDriverLicenseDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Golongan SIM wajib dipilih' })
  @Min(1, { message: 'Golongan SIM wajib dipilih' })
  licenseClassId!: number;

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
