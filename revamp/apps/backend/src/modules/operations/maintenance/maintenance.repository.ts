import { Injectable } from '@nestjs/common';
import { type MaintenanceStatus, type MaintenanceType, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const recordInclude = {
  vehicle: { select: { id: true, plateNumber: true, model: { select: { brand: true } } } },
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.MaintenanceRecordInclude;

export type MaintenanceWithRefs = Prisma.MaintenanceRecordGetPayload<{
  include: typeof recordInclude;
}>;

export interface ListMaintenanceFilter extends PageParams {
  readonly vehicleId?: string;
  readonly type?: MaintenanceType;
  readonly status?: MaintenanceStatus;
  readonly from?: Date;
  readonly to?: Date;
}

@Injectable()
export class MaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListMaintenanceFilter): Prisma.MaintenanceRecordWhereInput {
    const dateFilter =
      filter.from || filter.to
        ? {
            date: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {};
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...dateFilter,
    };
  }

  async list(
    filter: ListMaintenanceFilter,
  ): Promise<{ rows: MaintenanceWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.maintenanceRecord.findMany({
        where,
        include: recordInclude,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.maintenanceRecord.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<MaintenanceWithRefs | null> {
    return this.prisma.maintenanceRecord.findUnique({ where: { id }, include: recordInclude });
  }

  vehicleExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  /** Count records whose code starts with the month prefix — drives the running sequence. */
  countByCodePrefix(prefix: string): Promise<number> {
    return this.prisma.maintenanceRecord.count({ where: { code: { startsWith: prefix } } });
  }

  /** Sum totalCost over records in the given (inclusive) date window — monthly-cost KPI. */
  async sumCost(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.maintenanceRecord.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { totalCost: true },
    });
    return result._sum.totalCost ?? 0;
  }

  // Unchecked input (scalar FKs): the audit middleware stamps the scalar
  // createdById/updatedById, which relation-style (checked) input would reject
  // because MaintenanceRecord declares createdBy/updatedBy relations.
  create(data: Prisma.MaintenanceRecordUncheckedCreateInput): Promise<MaintenanceWithRefs> {
    return this.prisma.maintenanceRecord.create({ data, include: recordInclude });
  }

  update(
    id: string,
    data: Prisma.MaintenanceRecordUncheckedUpdateInput,
  ): Promise<MaintenanceWithRefs> {
    return this.prisma.maintenanceRecord.update({ where: { id }, data, include: recordInclude });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.maintenanceRecord.delete({ where: { id } });
  }
}
