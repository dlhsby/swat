import { Injectable } from '@nestjs/common';
import { type FuelQuotaStatus, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const quotaInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
  site: { select: { id: true, name: true } },
} satisfies Prisma.FuelQuotaInclude;

export type FuelQuotaWithRefs = Prisma.FuelQuotaGetPayload<{ include: typeof quotaInclude }>;

export interface ListFuelQuotasFilter extends PageParams {
  readonly vehicleId?: number;
  readonly siteId?: number;
  readonly status?: FuelQuotaStatus;
  readonly activeOn?: Date;
}

@Injectable()
export class FuelQuotasRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListFuelQuotasFilter): Prisma.FuelQuotaWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.siteId ? { siteId: filter.siteId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.activeOn
        ? { validFrom: { lte: filter.activeOn }, validTo: { gte: filter.activeOn } }
        : {}),
    };
  }

  async list(filter: ListFuelQuotasFilter): Promise<{ rows: FuelQuotaWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fuelQuota.findMany({
        where,
        include: quotaInclude,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.fuelQuota.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: bigint): Promise<FuelQuotaWithRefs | null> {
    return this.prisma.fuelQuota.findUnique({ where: { id }, include: quotaInclude });
  }

  vehicleExists(id: number): Promise<{ id: number } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  siteExists(id: number): Promise<{ id: number } | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.FuelQuotaCreateInput): Promise<FuelQuotaWithRefs> {
    return this.prisma.fuelQuota.create({ data, include: quotaInclude });
  }

  update(id: bigint, data: Prisma.FuelQuotaUpdateInput): Promise<FuelQuotaWithRefs> {
    return this.prisma.fuelQuota.update({ where: { id }, data, include: quotaInclude });
  }
}
