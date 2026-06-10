import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const fuelInclude = {
  fuelCategory: { select: { id: true, name: true } },
} satisfies Prisma.FuelInclude;

export type FuelWithCategory = Prisma.FuelGetPayload<{ include: typeof fuelInclude }>;

export interface ListFuelsFilter extends PageParams {
  readonly fuelCategoryId?: string;
  readonly search?: string;
}

@Injectable()
export class FuelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListFuelsFilter): Prisma.FuelWhereInput {
    return {
      ...(filter.fuelCategoryId ? { fuelCategoryId: filter.fuelCategoryId } : {}),
      ...(filter.search ? { name: { contains: filter.search, mode: 'insensitive' } } : {}),
    };
  }

  async list(filter: ListFuelsFilter): Promise<{ rows: FuelWithCategory[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fuel.findMany({
        where,
        include: fuelInclude,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.fuel.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<FuelWithCategory | null> {
    return this.prisma.fuel.findUnique({ where: { id }, include: fuelInclude });
  }

  categoryExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.fuelCategory.findUnique({ where: { id }, select: { id: true } });
  }

  findByNameInCategory(fuelCategoryId: string, name: string): Promise<{ id: string } | null> {
    return this.prisma.fuel.findFirst({
      where: { fuelCategoryId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  countModels(id: string): Promise<number> {
    return this.prisma.vehicleModel.count({ where: { fuelId: id } });
  }

  create(data: Prisma.FuelCreateInput): Promise<FuelWithCategory> {
    return this.prisma.fuel.create({ data, include: fuelInclude });
  }

  update(id: string, data: Prisma.FuelUpdateInput): Promise<FuelWithCategory> {
    return this.prisma.fuel.update({ where: { id }, data, include: fuelInclude });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.fuel.delete({ where: { id }, select: { id: true } });
  }
}
