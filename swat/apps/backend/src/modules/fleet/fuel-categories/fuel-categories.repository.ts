import { Injectable } from '@nestjs/common';
import { type FuelCategory, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListFuelCategoriesFilter extends PageParams {
  readonly search?: string;
}

@Injectable()
export class FuelCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListFuelCategoriesFilter): Prisma.FuelCategoryWhereInput {
    return filter.search ? { name: { contains: filter.search, mode: 'insensitive' } } : {};
  }

  async list(filter: ListFuelCategoriesFilter): Promise<{ rows: FuelCategory[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fuelCategory.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.fuelCategory.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number): Promise<FuelCategory | null> {
    return this.prisma.fuelCategory.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<{ id: number } | null> {
    return this.prisma.fuelCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  countFuels(id: number): Promise<number> {
    return this.prisma.fuel.count({ where: { fuelCategoryId: id } });
  }

  create(data: Prisma.FuelCategoryCreateInput): Promise<FuelCategory> {
    return this.prisma.fuelCategory.create({ data });
  }

  update(id: number, data: Prisma.FuelCategoryUpdateInput): Promise<FuelCategory> {
    return this.prisma.fuelCategory.update({ where: { id }, data });
  }

  delete(id: number): Promise<{ id: number }> {
    return this.prisma.fuelCategory.delete({ where: { id }, select: { id: true } });
  }
}
