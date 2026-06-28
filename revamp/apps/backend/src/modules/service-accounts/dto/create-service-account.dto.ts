import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsIP,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceAccountDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'TPA Jembatan Timbang' })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name!: string;

  @ApiProperty({ description: 'Role id (UUID) granting the API permissions' })
  @IsUUID(undefined, { message: 'Peran wajib dipilih' })
  roleId!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000, default: 500 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Batas laju minimal 1 permintaan/menit' })
  @Max(100000)
  rateLimitPerMin?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional source IP allowlist; empty = any IP',
    example: ['10.0.0.5', '10.0.0.6'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsIP(undefined, { each: true, message: 'Setiap entri harus berupa alamat IP yang valid' })
  allowedIPs?: string[];
}
