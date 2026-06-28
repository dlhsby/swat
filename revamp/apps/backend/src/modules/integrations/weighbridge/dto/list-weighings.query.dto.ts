import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

/** Filter recorded weighings (parity: getpembuangansampahbyfilter). */
export class ListWeighingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-06-05', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plateNumber?: string;

  @ApiPropertyOptional({ description: 'Site id (UUID)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Site id harus berupa UUID' })
  siteId?: string;
}
