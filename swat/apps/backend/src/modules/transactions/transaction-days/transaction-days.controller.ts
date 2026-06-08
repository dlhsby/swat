import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { type DailyInitResult } from '../daily-init/daily-init.service';

import { FindTransactionDayQueryDto } from './dto/find-transaction-day.query.dto';
import { UpdateTransactionDayDto } from './dto/update-transaction-day.dto';
import { type TransactionDayDto, TransactionDaysService } from './transaction-days.service';

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

  @Post('initialize-today')
  @RequirePermissions('transaction-day:manage')
  @ApiOperation({ summary: 'Manually run daily initialization for today (idempotent)' })
  initializeToday(): Promise<DailyInitResult> {
    return this.transactionDays.initializeToday();
  }

  @Get(':id')
  @RequirePermissions('transaction-day:read')
  @ApiOperation({ summary: 'Get a transaction day by id, with its full tree' })
  getById(@Param('id', ParseIntPipe) id: number): Promise<TransactionDayDto> {
    return this.transactionDays.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('transaction-day:manage')
  @ApiOperation({ summary: 'Update a transaction day status (mark DONE when hauls complete)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionDayDto,
  ): Promise<TransactionDayDto> {
    return this.transactionDays.updateStatus(id, dto.status);
  }
}
