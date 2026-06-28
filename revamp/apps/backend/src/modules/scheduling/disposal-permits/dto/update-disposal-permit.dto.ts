import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisposalPermitStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Update is limited to extend/revoke per the kitir lifecycle. */
export class UpdateDisposalPermitDto {
  @ApiPropertyOptional({ enum: DisposalPermitStatus })
  @IsOptional()
  @IsEnum(DisposalPermitStatus)
  status?: DisposalPermitStatus;

  @ApiPropertyOptional({ example: '2026-07-31', description: 'New valid-to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validTo?: string;
}
