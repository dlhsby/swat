import { Injectable } from '@nestjs/common';
import { type DisposalPermitStatus, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const permitInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
  site: { select: { id: true, name: true } },
} satisfies Prisma.DisposalPermitInclude;

export type DisposalPermitWithRefs = Prisma.DisposalPermitGetPayload<{
  include: typeof permitInclude;
}>;

export interface ListDisposalPermitsFilter extends PageParams {
  readonly vehicleId?: string;
  readonly siteId?: string;
  readonly status?: DisposalPermitStatus;
  readonly activeOn?: Date;
}

@Injectable()
export class DisposalPermitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListDisposalPermitsFilter): Prisma.DisposalPermitWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.siteId ? { siteId: filter.siteId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.activeOn
        ? { validFrom: { lte: filter.activeOn }, validTo: { gte: filter.activeOn } }
        : {}),
    };
  }

  async list(
    filter: ListDisposalPermitsFilter,
  ): Promise<{ rows: DisposalPermitWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.disposalPermit.findMany({
        where,
        include: permitInclude,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.disposalPermit.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<DisposalPermitWithRefs | null> {
    return this.prisma.disposalPermit.findUnique({ where: { id }, include: permitInclude });
  }

  vehicleExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  siteExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.DisposalPermitCreateInput): Promise<DisposalPermitWithRefs> {
    return this.prisma.disposalPermit.create({ data, include: permitInclude });
  }

  async allVehicleIds(): Promise<Set<string>> {
    const rows = await this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async allSiteIds(): Promise<Set<string>> {
    const rows = await this.prisma.site.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async existingLegacyIds(legacyIds: number[]): Promise<Set<number>> {
    if (legacyIds.length === 0) {
      return new Set();
    }
    const rows = await this.prisma.disposalPermit.findMany({
      where: { legacyId: { in: legacyIds } },
      select: { legacyId: true },
    });
    return new Set(rows.flatMap((r) => (r.legacyId === null ? [] : [r.legacyId])));
  }

  /** Idempotent by legacyId — used by the bulk importer. */
  async upsertByLegacyId(
    legacyId: number,
    create: Prisma.DisposalPermitCreateInput,
    update: Prisma.DisposalPermitUpdateInput,
  ): Promise<void> {
    await this.prisma.disposalPermit.upsert({
      where: { legacyId },
      create: { ...create, legacyId },
      update,
    });
  }

  async createPlain(data: Prisma.DisposalPermitCreateInput): Promise<void> {
    await this.prisma.disposalPermit.create({ data });
  }

  update(id: string, data: Prisma.DisposalPermitUpdateInput): Promise<DisposalPermitWithRefs> {
    return this.prisma.disposalPermit.update({ where: { id }, data, include: permitInclude });
  }
}
