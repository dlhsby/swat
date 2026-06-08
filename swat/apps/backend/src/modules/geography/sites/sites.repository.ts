import { Injectable } from '@nestjs/common';
import { type Prisma, type Site, SiteType } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListSitesFilter extends PageParams {
  readonly type?: SiteType;
  readonly search?: string;
}

@Injectable()
export class SitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListSitesFilter): Prisma.SiteWhereInput {
    return {
      deletedAt: null,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { address: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(filter: ListSitesFilter): Promise<{ rows: Site[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.site.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.site.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number): Promise<Site | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.SiteCreateInput): Promise<Site> {
    return this.prisma.site.create({ data });
  }

  update(id: number, data: Prisma.SiteUpdateInput): Promise<Site> {
    return this.prisma.site.update({ where: { id }, data });
  }

  softDelete(id: number): Promise<Site> {
    return this.prisma.site.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
