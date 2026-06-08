import { Injectable } from '@nestjs/common';
import { type InspectionResult, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const inspectionInclude = {
  vehicle: { select: { id: true, plateNumber: true, model: { select: { brand: true } } } },
  inspector: { select: { id: true, name: true } },
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.VehicleInspectionInclude;

export type InspectionWithRefs = Prisma.VehicleInspectionGetPayload<{
  include: typeof inspectionInclude;
}>;

export interface ListInspectionsFilter extends PageParams {
  readonly vehicleId?: number;
  readonly result?: InspectionResult;
  readonly date?: Date;
}

@Injectable()
export class InspectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListInspectionsFilter): Prisma.VehicleInspectionWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.result ? { result: filter.result } : {}),
      ...(filter.date ? { date: filter.date } : {}),
    };
  }

  async list(
    filter: ListInspectionsFilter,
  ): Promise<{ rows: InspectionWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicleInspection.findMany({
        where,
        include: inspectionInclude,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.vehicleInspection.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: bigint): Promise<InspectionWithRefs | null> {
    return this.prisma.vehicleInspection.findUnique({ where: { id }, include: inspectionInclude });
  }

  vehicleExists(id: number): Promise<{ id: number } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.VehicleInspectionCreateInput): Promise<InspectionWithRefs> {
    return this.prisma.vehicleInspection.create({ data, include: inspectionInclude });
  }

  update(id: bigint, data: Prisma.VehicleInspectionUpdateInput): Promise<InspectionWithRefs> {
    return this.prisma.vehicleInspection.update({
      where: { id },
      data,
      include: inspectionInclude,
    });
  }

  async delete(id: bigint): Promise<void> {
    await this.prisma.vehicleInspection.delete({ where: { id } });
  }
}
