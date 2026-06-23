import { Injectable } from '@nestjs/common';
import { type Prisma, type VehicleStatus } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const vehicleInclude = {
  model: {
    select: {
      id: true,
      brand: true,
      vehicleType: { select: { name: true } },
      fuel: { select: { name: true } },
    },
  },
  poolSite: { select: { id: true, name: true } },
  wasteSources: { include: { wasteSource: { select: { code: true } } } },
} satisfies Prisma.VehicleInclude;

export type VehicleWithRefs = Prisma.VehicleGetPayload<{ include: typeof vehicleInclude }>;

export interface ListVehiclesFilter extends PageParams {
  readonly status?: VehicleStatus;
  readonly poolSiteId?: string;
  readonly modelId?: string;
  readonly search?: string;
}

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListVehiclesFilter): Prisma.VehicleWhereInput {
    return {
      deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.poolSiteId ? { poolSiteId: filter.poolSiteId } : {}),
      ...(filter.modelId ? { modelId: filter.modelId } : {}),
      ...(filter.search ? { plateNumber: { contains: filter.search, mode: 'insensitive' } } : {}),
    };
  }

  async list(filter: ListVehiclesFilter): Promise<{ rows: VehicleWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: vehicleInclude,
        orderBy: { plateNumber: 'asc' },
        skip,
        take,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<VehicleWithRefs | null> {
    return this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: vehicleInclude,
    });
  }

  /** Plate uniqueness spans all rows (including soft-deleted) per the DB constraint. */
  findByPlate(plateNumber: string): Promise<{ id: string } | null> {
    return this.prisma.vehicle.findUnique({ where: { plateNumber }, select: { id: true } });
  }

  modelExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicleModel.findUnique({ where: { id }, select: { id: true } });
  }

  siteExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.VehicleCreateInput): Promise<VehicleWithRefs> {
    return this.prisma.vehicle.create({ data, include: vehicleInclude });
  }

  update(id: string, data: Prisma.VehicleUpdateInput): Promise<VehicleWithRefs> {
    return this.prisma.vehicle.update({ where: { id }, data, include: vehicleInclude });
  }

  softDelete(id: string): Promise<{ id: string }> {
    return this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
