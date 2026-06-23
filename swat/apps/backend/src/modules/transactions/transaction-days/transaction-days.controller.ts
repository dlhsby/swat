import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../../common/types/api-response';
import { type DailyInitResult } from '../daily-init/daily-init.service';

import { FindTransactionDayQueryDto } from './dto/find-transaction-day.query.dto';
import { ListTransactionDaysQueryDto } from './dto/list-transaction-days.query.dto';
import { UpdateTransactionDayDto } from './dto/update-transaction-day.dto';
import {
  type TransactionDayDto,
  type TransactionDaySummaryDto,
  TransactionDaysService,
} from './transaction-days.service';

@ApiTags('transaction-days')
@Controller('transaction-days')
export class TransactionDaysController {
  constructor(private readonly transactionDays: TransactionDaysService) {}

  @Get()
  @RequirePermissions('transaction-day:read')
  @ApiOperation({ summary: 'Get the transaction day for a date, with its full tree' })
  getByDate(@Query() query: FindTransactionDayQueryDto): Promise<TransactionDayDto> {
    return this.transactionDays.getByDate(query.date);
  }

  @Get('list')
  @RequirePermissions('transaction-day:read')
  @ApiOperation({ summary: 'List transaction days (paginated, newest first)' })
  list(
    @Query() query: ListTransactionDaysQueryDto,
  ): Promise<{ data: TransactionDaySummaryDto[]; meta: PaginationMeta }> {
    return this.transactionDays.list(query);
  }

  @Post('initialize-today')
  @RequirePermissions('transaction-day:manage')
  @ApiOperation({ summary: 'Manually run daily initialization for today (idempotent)' })
  initializeToday(): Promise<DailyInitResult> {
    return this.transactionDays.initializeToday();
  }

  @Get(':id')
  @RequirePermissions('transaction-day:read')
  @ApiOperation({ summary: 'Get a transaction day by id, with its full tree' })
  getById(@Param('id') id: string): Promise<TransactionDayDto> {
    return this.transactionDays.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('transaction-day:manage')
  @ApiOperation({ summary: 'Update a transaction day status (mark DONE when hauls complete)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDayDto,
  ): Promise<TransactionDayDto> {
    return this.transactionDays.updateStatus(id, dto.status);
  }
}
