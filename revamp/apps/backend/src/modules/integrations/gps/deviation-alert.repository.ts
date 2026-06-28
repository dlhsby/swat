import { Injectable } from '@nestjs/common';
import { type DeviationAlert, type DeviationType, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListAlertsFilter extends PageParams {
  readonly vehicleId?: string;
  readonly acknowledged?: boolean;
  readonly resolved?: boolean;
  readonly from?: Date;
  readonly to?: Date;
}

const alertInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
} satisfies Prisma.DeviationAlertInclude;

export type DeviationAlertWithVehicle = Prisma.DeviationAlertGetPayload<{
  include: typeof alertInclude;
}>;

@Injectable()
export class DeviationAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The latest OPEN (unresolved) alert of a type for a vehicle — coalesce target. */
  findOpen(vehicleId: string, alertType: DeviationType): Promise<{ id: string } | null> {
    return this.prisma.deviationAlert.findFirst({
      where: { vehicleId, alertType, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }

  create(data: Prisma.DeviationAlertCreateInput): Promise<DeviationAlertWithVehicle> {
    return this.prisma.deviationAlert.create({ data, include: alertInclude });
  }

  async incrementPingCount(id: string): Promise<void> {
    await this.prisma.deviationAlert.update({
      where: { id },
      data: { pingCount: { increment: 1 } },
    });
  }

  /** Auto-resolve every open alert of a type for a vehicle (e.g. corridor re-entry). */
  async resolveOpen(vehicleId: string, alertType: DeviationType): Promise<number> {
    const result = await this.prisma.deviationAlert.updateMany({
      where: { vehicleId, alertType, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    return result.count;
  }

  findById(id: string): Promise<DeviationAlertWithVehicle | null> {
    return this.prisma.deviationAlert.findUnique({ where: { id }, include: alertInclude });
  }

  acknowledge(
    id: string,
    userId: string | null,
    notes: string | null,
  ): Promise<DeviationAlertWithVehicle> {
    return this.prisma.deviationAlert.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
        ...(notes !== null ? { notes } : {}),
      },
      include: alertInclude,
    });
  }

  private listWhere(filter: ListAlertsFilter): Prisma.DeviationAlertWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.acknowledged !== undefined ? { isAcknowledged: filter.acknowledged } : {}),
      ...(filter.resolved === true ? { resolvedAt: { not: null } } : {}),
      ...(filter.resolved === false ? { resolvedAt: null } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };
  }

  async list(
    filter: ListAlertsFilter,
  ): Promise<{ rows: DeviationAlertWithVehicle[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.deviationAlert.findMany({
        where,
        include: alertInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.deviationAlert.count({ where }),
    ]);
    return { rows, total };
  }
}

export type { DeviationAlert };
