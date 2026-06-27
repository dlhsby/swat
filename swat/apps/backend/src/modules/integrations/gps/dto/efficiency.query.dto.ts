import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Inclusive operation-date range for the efficiency dashboard (YYYY-MM-DD). */
export class EfficiencyQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'YYYY-MM-DD' })
  @Matches(DATE_RE, { message: 'Tanggal mulai harus format YYYY-MM-DD' })
  from!: string;

  @ApiProperty({ example: '2026-06-30', description: 'YYYY-MM-DD' })
  @Matches(DATE_RE, { message: 'Tanggal akhir harus format YYYY-MM-DD' })
  to!: string;
}
