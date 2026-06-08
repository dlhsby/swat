import { Injectable } from '@nestjs/common';
import { type Prisma, type WasteSource } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListWasteSourcesFilter extends PageParams {
  readonly search?: string;
}

@Injectable()
export class WasteSourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListWasteSourcesFilter): Prisma.WasteSourceWhereInput {
    return filter.search
      ? {
          OR: [
            { code: { contains: filter.search, mode: 'insensitive' } },
            { name: { contains: filter.search, mode: 'insensitive' } },
          ],
        }
      : {};
  }

  async list(filter: ListWasteSourcesFilter): Promise<{ rows: WasteSource[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.wasteSource.findMany({ where, orderBy: { code: 'asc' }, skip, take }),
      this.prisma.wasteSource.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number): Promise<WasteSource | null> {
    return this.prisma.wasteSource.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<{ id: number } | null> {
    return this.prisma.wasteSource.findUnique({ where: { code }, select: { id: true } });
  }

  countVehicleLinks(id: number): Promise<number> {
    return this.prisma.vehicleWasteSource.count({ where: { wasteSourceId: id } });
  }

  create(data: Prisma.WasteSourceCreateInput): Promise<WasteSource> {
    return this.prisma.wasteSource.create({ data });
  }

  update(id: number, data: Prisma.WasteSourceUpdateInput): Promise<WasteSource> {
    return this.prisma.wasteSource.update({ where: { id }, data });
  }

  delete(id: number): Promise<{ id: number }> {
    return this.prisma.wasteSource.delete({ where: { id }, select: { id: true } });
  }
}
