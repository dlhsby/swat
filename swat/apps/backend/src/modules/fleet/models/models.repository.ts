import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const modelInclude = {
  application: { select: { id: true, name: true } },
  fuel: { select: { id: true, name: true } },
} satisfies Prisma.VehicleModelInclude;

export type VehicleModelWithRefs = Prisma.VehicleModelGetPayload<{ include: typeof modelInclude }>;

export interface ListVehicleModelsFilter extends PageParams {
  readonly applicationId?: string;
  readonly fuelId?: string;
  readonly search?: string;
}

@Injectable()
export class VehicleModelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListVehicleModelsFilter): Prisma.VehicleModelWhereInput {
    return {
      ...(filter.applicationId ? { applicationId: filter.applicationId } : {}),
      ...(filter.fuelId ? { fuelId: filter.fuelId } : {}),
      ...(filter.search ? { brand: { contains: filter.search, mode: 'insensitive' } } : {}),
    };
  }

  async list(
    filter: ListVehicleModelsFilter,
  ): Promise<{ rows: VehicleModelWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicleModel.findMany({
        where,
        include: modelInclude,
        orderBy: { brand: 'asc' },
        skip,
        take,
      }),
      this.prisma.vehicleModel.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<VehicleModelWithRefs | null> {
    return this.prisma.vehicleModel.findUnique({ where: { id }, include: modelInclude });
  }

  applicationExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicleApplication.findUnique({ where: { id }, select: { id: true } });
  }

  fuelExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.fuel.findUnique({ where: { id }, select: { id: true } });
  }

  countVehicles(id: string): Promise<number> {
    return this.prisma.vehicle.count({ where: { modelId: id, deletedAt: null } });
  }

  create(data: Prisma.VehicleModelCreateInput): Promise<VehicleModelWithRefs> {
    return this.prisma.vehicleModel.create({ data, include: modelInclude });
  }

  update(id: string, data: Prisma.VehicleModelUpdateInput): Promise<VehicleModelWithRefs> {
    return this.prisma.vehicleModel.update({ where: { id }, data, include: modelInclude });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.vehicleModel.delete({ where: { id }, select: { id: true } });
  }
}
