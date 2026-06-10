import { Injectable } from '@nestjs/common';
import { type Prisma, type VehicleApplication } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListApplicationsFilter extends PageParams {
  readonly search?: string;
}

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListApplicationsFilter): Prisma.VehicleApplicationWhereInput {
    return filter.search ? { name: { contains: filter.search, mode: 'insensitive' } } : {};
  }

  async list(
    filter: ListApplicationsFilter,
  ): Promise<{ rows: VehicleApplication[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicleApplication.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.vehicleApplication.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<VehicleApplication | null> {
    return this.prisma.vehicleApplication.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.vehicleApplication.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  countModels(id: string): Promise<number> {
    return this.prisma.vehicleModel.count({ where: { applicationId: id } });
  }

  create(data: Prisma.VehicleApplicationCreateInput): Promise<VehicleApplication> {
    return this.prisma.vehicleApplication.create({ data });
  }

  update(id: string, data: Prisma.VehicleApplicationUpdateInput): Promise<VehicleApplication> {
    return this.prisma.vehicleApplication.update({ where: { id }, data });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.vehicleApplication.delete({ where: { id }, select: { id: true } });
  }
}
