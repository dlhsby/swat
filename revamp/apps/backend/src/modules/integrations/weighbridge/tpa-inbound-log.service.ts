import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface TpaInboundLogInput {
  readonly dateLabel: string;
  readonly date: Date;
  readonly plateNumber: string;
  readonly depot: string | null;
  readonly grossWeight: number;
  readonly tareWeight: number;
  readonly netWeight: number;
  readonly cctvReference: string | null;
  readonly tripId: string;
}

/**
 * Writes a {@link TpaInboundLog} row for every posted weighing (Phase 4, T-409).
 * This is the reconciliation source: the nightly job (Phase 2) compares the sum
 * of DISPOSAL trip net weights against these logs. Linked to the Trip via
 * `tripId`. Indexed on date/plateNumber/tripId for reporting queries.
 */
@Injectable()
export class TpaInboundLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: TpaInboundLogInput): Promise<{ id: string }> {
    const row = await this.prisma.tpaInboundLog.create({
      data: {
        dateLabel: input.dateLabel,
        date: input.date,
        plateNumber: input.plateNumber,
        depot: input.depot,
        sourceTruck: input.plateNumber,
        grossWeight: input.grossWeight,
        tareWeight: input.tareWeight,
        netWeight: input.netWeight,
        cctvReference: input.cctvReference,
        tripId: input.tripId,
      },
      select: { id: true },
    });
    return row;
  }

  /** Update the inbound log linked to a trip (used by PATCH weighings/:tripId). */
  async updateByTripId(
    tripId: string,
    data: Partial<
      Pick<TpaInboundLogInput, 'grossWeight' | 'tareWeight' | 'netWeight' | 'cctvReference'>
    >,
  ): Promise<void> {
    await this.prisma.tpaInboundLog.updateMany({ where: { tripId }, data });
  }
}
