import { Injectable } from '@nestjs/common';
import { type Levy, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

export interface ListLevyFilter extends PageParams {
  readonly categoryName?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

@Injectable()
export class LevyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListLevyFilter): Prisma.LevyWhereInput {
    const dateFilter: Prisma.DateTimeFilter = {
      ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
      ...(filter.dateTo ? { lte: filter.dateTo } : {}),
    };
    return {
      ...(filter.categoryName
        ? { categoryName: { contains: filter.categoryName, mode: 'insensitive' } }
        : {}),
      ...(filter.dateFrom || filter.dateTo ? { date: dateFilter } : {}),
    };
  }

  async list(filter: ListLevyFilter): Promise<{ rows: Levy[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.levy.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.levy.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<Levy | null> {
    return this.prisma.levy.findUnique({ where: { id } });
  }

  create(data: Prisma.LevyUncheckedCreateInput): Promise<Levy> {
    return this.prisma.levy.create({ data });
  }

  update(id: string, data: Prisma.LevyUncheckedUpdateInput): Promise<Levy> {
    return this.prisma.levy.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.levy.delete({ where: { id } });
  }
}
