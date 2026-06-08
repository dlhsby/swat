import { Injectable } from '@nestjs/common';
import { type DayStatus, type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { haulAssignmentInclude } from '../haul-assignments/haul-assignment.mapper';

const dayInclude = {
  hauls: {
    include: {
      vehicle: { select: { id: true, plateNumber: true } },
      assignments: { include: haulAssignmentInclude, orderBy: { id: 'asc' } },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.TransactionDayInclude;

export type TransactionDayWithTree = Prisma.TransactionDayGetPayload<{
  include: typeof dayInclude;
}>;

@Injectable()
export class TransactionDaysRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number): Promise<TransactionDayWithTree | null> {
    return this.prisma.transactionDay.findUnique({ where: { id }, include: dayInclude });
  }

  findByDate(date: Date): Promise<TransactionDayWithTree | null> {
    return this.prisma.transactionDay.findUnique({ where: { date }, include: dayInclude });
  }

  updateStatus(id: number, status: DayStatus): Promise<TransactionDayWithTree> {
    return this.prisma.transactionDay.update({
      where: { id },
      data: { status },
      include: dayInclude,
    });
  }

  countOpenHauls(id: number): Promise<number> {
    return this.prisma.haul.count({
      where: { transactionDayId: id, status: { not: 'DONE' } },
    });
  }
}
