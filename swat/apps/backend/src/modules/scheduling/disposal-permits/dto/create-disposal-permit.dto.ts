import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisposalPermitStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateDisposalPermitDto {
  @ApiPropertyOptional({ maxLength: 50, description: 'Kitir code (auto/blank if omitted)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  siteId!: string;

  @ApiProperty({ example: '2026-06-01', description: 'Issued date (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  issuedAt!: string;

  @ApiProperty({ example: '2026-06-01', description: 'Valid from (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validFrom!: string;

  @ApiProperty({ example: '2026-06-30', description: 'Valid to (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validTo!: string;

  @ApiPropertyOptional({ enum: DisposalPermitStatus, default: DisposalPermitStatus.ACTIVE })
  @IsOptional()
  @IsEnum(DisposalPermitStatus)
  status?: DisposalPermitStatus;
}
