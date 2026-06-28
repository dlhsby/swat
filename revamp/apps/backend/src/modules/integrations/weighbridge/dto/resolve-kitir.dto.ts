import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Resolve a kitir by `code` OR `plateNumber` (service enforces at-least-one). */
export class ResolveKitirDto {
  @ApiPropertyOptional({ example: 'KT-202606-0042', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'L-1234-AB', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber?: string;

  @ApiPropertyOptional({ example: '2026-06-05', description: 'YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date!: string;
}
