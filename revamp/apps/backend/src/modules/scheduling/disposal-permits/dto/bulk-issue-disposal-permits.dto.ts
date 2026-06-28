import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Issue N identical kitir in one call (legacy `insertJatahKitir`, which took a
 * count and returned the printable ids). Each permit gets its own auto-generated
 * KT-YYYYMM-NNNN barcode; the response returns all N for client-side printing.
 */
export class BulkIssueDisposalPermitsDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsUUID()
  siteId!: string;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Issued date (YYYY-MM-DD); defaults to today',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  issuedAt?: string;

  @ApiProperty({ example: '2026-06-01', description: 'Valid from (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validFrom!: string;

  @ApiProperty({ example: '2026-06-30', description: 'Valid to (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validTo!: string;

  @ApiProperty({ minimum: 1, maximum: 200, description: 'How many kitir to issue' })
  @Type(() => Number)
  @IsInt({ message: 'Jumlah harus berupa angka' })
  @Min(1, { message: 'Jumlah minimal 1' })
  @Max(200, { message: 'Jumlah maksimal 200' })
  count!: number;
}
