import { ApiPropertyOptional } from '@nestjs/swagger';
import { FuelQuotaStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Update is limited to extend/revoke per the kitir lifecycle. */
export class UpdateFuelQuotaDto {
  @ApiPropertyOptional({ enum: FuelQuotaStatus })
  @IsOptional()
  @IsEnum(FuelQuotaStatus)
  status?: FuelQuotaStatus;

  @ApiPropertyOptional({ example: '2026-07-31', description: 'New valid-to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validTo?: string;
}
