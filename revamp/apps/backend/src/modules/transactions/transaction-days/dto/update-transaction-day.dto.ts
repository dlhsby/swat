import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const DAY_STATUSES = ['IN_PROGRESS', 'DONE'] as const;

export class UpdateTransactionDayDto {
  @ApiProperty({ enum: DAY_STATUSES })
  @IsIn(DAY_STATUSES, { message: 'Status hari transaksi tidak valid' })
  status!: (typeof DAY_STATUSES)[number];
}
