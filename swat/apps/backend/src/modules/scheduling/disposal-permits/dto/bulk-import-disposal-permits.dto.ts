import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisposalPermitStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export enum BulkImportStrategy {
  /** Update the existing row when a legacyId already exists. */
  UPSERT = 'UPSERT',
  /** Leave existing rows untouched; count them as skipped. */
  SKIP = 'SKIP',
}

export class BulkDisposalPermitRowDto {
  @ApiPropertyOptional({ description: 'Legacy id for idempotent upsert' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  legacyId?: number;

  @ApiPropertyOptional({ maxLength: 50 })
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

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validFrom!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  validTo!: string;

  @ApiPropertyOptional({ enum: DisposalPermitStatus, default: DisposalPermitStatus.ACTIVE })
  @IsOptional()
  @IsEnum(DisposalPermitStatus)
  status?: DisposalPermitStatus;
}

export class BulkImportDisposalPermitsDto {
  @ApiPropertyOptional({ enum: BulkImportStrategy, default: BulkImportStrategy.UPSERT })
  @IsOptional()
  @IsEnum(BulkImportStrategy)
  strategy?: BulkImportStrategy;

  @ApiProperty({
    type: [BulkDisposalPermitRowDto],
    description: 'Parsed rows (max 20k per request)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20000)
  @ValidateNested({ each: true })
  @Type(() => BulkDisposalPermitRowDto)
  rows!: BulkDisposalPermitRowDto[];
}

export interface BulkImportResult {
  readonly total: number;
  readonly imported: number;
  readonly updated: number;
  readonly skipped: number;
  readonly errorCount: number;
  readonly errors: ReadonlyArray<{ row: number; reason: string }>;
}
