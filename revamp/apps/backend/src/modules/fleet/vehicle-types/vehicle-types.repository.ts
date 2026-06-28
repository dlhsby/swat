import { Injectable } from '@nestjs/common';
import { type Prisma, type VehicleType } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListApplicationsFilter extends PageParams {
  readonly search?: string;
}

@Injectable()
export class VehicleTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListApplicationsFilter): Prisma.VehicleTypeWhereInput {
    return filter.search ? { name: { contains: filter.search, mode: 'insensitive' } } : {};
  }

  async list(filter: ListApplicationsFilter): Promise<{ rows: VehicleType[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicleType.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.vehicleType.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<VehicleType | null> {
    return this.prisma.vehicleType.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.vehicleType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  countModels(id: string): Promise<number> {
    return this.prisma.vehicleModel.count({ where: { vehicleTypeId: id } });
  }

  create(data: Prisma.VehicleTypeCreateInput): Promise<VehicleType> {
    return this.prisma.vehicleType.create({ data });
  }

  update(id: string, data: Prisma.VehicleTypeUpdateInput): Promise<VehicleType> {
    return this.prisma.vehicleType.update({ where: { id }, data });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.vehicleType.delete({ where: { id }, select: { id: true } });
  }
}
