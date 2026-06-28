import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class FindTransactionDayQueryDto {
  @ApiProperty({ example: '2026-06-08', description: 'Calendar date (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal harus berformat YYYY-MM-DD' })
  date!: string;
}
