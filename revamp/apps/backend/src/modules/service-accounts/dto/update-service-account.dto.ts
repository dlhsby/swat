import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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

export class UpdateServiceAccountDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Peran tidak valid' })
  roleId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Batas laju minimal 1 permintaan/menit' })
  @Max(100000)
  rateLimitPerMin?: number;

  @ApiPropertyOptional({ type: [String], description: 'Source IP allowlist; empty = any IP' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsIP(undefined, { each: true, message: 'Setiap entri harus berupa alamat IP yang valid' })
  allowedIPs?: string[];

  @ApiPropertyOptional({ description: 'Set false to deactivate (does not revoke the key hash)' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
