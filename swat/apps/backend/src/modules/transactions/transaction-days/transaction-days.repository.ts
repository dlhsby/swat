import { Injectable } from '@nestjs/common';
import { type DayStatus, type Prisma } from '@prisma/client';

import { type PageParams, toSkipTake } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { haulAssignmentInclude } from '../haul-assignments/haul-assignment.mapper';

/** Lightweight per-day summary row for the paginated list (no haul/trip tree). */
export interface TransactionDaySummaryRow {
  readonly id: string;
  readonly date: Date;
  readonly status: DayStatus;
  /** Scheduled vehicles for the day = number of hauls. */
  readonly vehicleCount: number;
  /** Disposal tonnage (kg) from the `daily_tonnage` rollup; 0 when not rolled up. */
  readonly tonnageKg: number;
}

export interface ListTransactionDaysFilter extends PageParams {
  readonly status?: DayStatus;
}

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

  findById(id: string): Promise<TransactionDayWithTree | null> {
    return this.prisma.transactionDay.findUnique({ where: { id }, include: dayInclude });
  }

  findByDate(date: Date): Promise<TransactionDayWithTree | null> {
    return this.prisma.transactionDay.findUnique({ where: { date }, include: dayInclude });
  }

  updateStatus(id: string, status: DayStatus): Promise<TransactionDayWithTree> {
    return this.prisma.transactionDay.update({
      where: { id },
      data: { status },
      include: dayInclude,
    });
  }

  countOpenHauls(id: string): Promise<number> {
    return this.prisma.haul.count({
      where: { transactionDayId: id, status: { not: 'DONE' } },
    });
  }

  /**
   * CCTV references for the given trips from the TPA weighbridge log. `tripId` is a
   * plain column on the partitioned-trip-adjacent log (no Prisma relation), so this
   * is a separate keyed lookup rather than an include.
   */
  async cctvByTripIds(ids: string[]): Promise<{ tripId: string; cctvReference: string }[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.tpaInboundLog.findMany({
      where: { tripId: { in: ids }, cctvReference: { not: null } },
      select: { tripId: true, cctvReference: true },
    });
    return rows.flatMap((r) =>
      r.tripId && r.cctvReference ? [{ tripId: r.tripId, cctvReference: r.cctvReference }] : [],
    );
  }

  /**
   * A page of day summaries (newest first). Aggregates only over the page's days:
   * the scheduled-vehicle count comes from a `haul` groupBy and the tonnage from
   * the `daily_tonnage` rollup, so the full haul/trip tree is never loaded.
   */
  async listSummaries(
    filter: ListTransactionDaysFilter,
  ): Promise<{ rows: TransactionDaySummaryRow[]; total: number }> {
    const where: Prisma.TransactionDayWhereInput = filter.status ? { status: filter.status } : {};
    const { skip, take } = toSkipTake(filter);
    const [days, total] = await this.prisma.$transaction([
      this.prisma.transactionDay.findMany({
        where,
        select: { id: true, date: true, status: true },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      this.prisma.transactionDay.count({ where }),
    ]);
    if (days.length === 0) {
      return { rows: [], total };
    }

    const ids = days.map((d) => d.id);
    const dates = days.map((d) => d.date);
    const [haulCounts, tonnages] = await Promise.all([
      this.prisma.haul.groupBy({
        by: ['transactionDayId'],
        where: { transactionDayId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.dailyTonnage.findMany({
        where: { date: { in: dates } },
        select: { date: true, amount: true },
      }),
    ]);

    const vehicleByDay = new Map(haulCounts.map((h) => [h.transactionDayId, h._count._all]));
    const tonnageByDate = new Map(
      tonnages.map((t) => [t.date.toISOString().slice(0, 10), Number(t.amount)]),
    );
    const rows = days.map((d) => ({
      id: d.id,
      date: d.date,
      status: d.status,
      vehicleCount: vehicleByDay.get(d.id) ?? 0,
      tonnageKg: tonnageByDate.get(d.date.toISOString().slice(0, 10)) ?? 0,
    }));
    return { rows, total };
  }
}
