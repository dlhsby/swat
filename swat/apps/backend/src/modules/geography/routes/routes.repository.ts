import { Injectable } from '@nestjs/common';
import { type Prisma, RouteCategory } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const routeInclude = {
  originSite: { select: { id: true, name: true, type: true } },
  destinationSite: { select: { id: true, name: true, type: true } },
} satisfies Prisma.RouteInclude;

export type RouteWithSites = Prisma.RouteGetPayload<{ include: typeof routeInclude }>;

export interface ListRoutesFilter extends PageParams {
  readonly category?: RouteCategory;
  readonly originSiteId?: number;
  readonly destinationSiteId?: number;
}

@Injectable()
export class RoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListRoutesFilter): Prisma.RouteWhereInput {
    return {
      deletedAt: null,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.originSiteId ? { originSiteId: filter.originSiteId } : {}),
      ...(filter.destinationSiteId ? { destinationSiteId: filter.destinationSiteId } : {}),
    };
  }

  async list(filter: ListRoutesFilter): Promise<{ rows: RouteWithSites[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.route.findMany({
        where,
        include: routeInclude,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.route.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number): Promise<RouteWithSites | null> {
    return this.prisma.route.findFirst({ where: { id, deletedAt: null }, include: routeInclude });
  }

  /** Active duplicate of the unique (origin, destination, category) triple. */
  findDuplicate(
    originSiteId: number,
    destinationSiteId: number,
    category: RouteCategory,
    excludeId?: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.route.findFirst({
      where: {
        originSiteId,
        destinationSiteId,
        category,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  siteExists(id: number): Promise<{ id: number } | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.RouteCreateInput): Promise<RouteWithSites> {
    return this.prisma.route.create({ data, include: routeInclude });
  }

  update(id: number, data: Prisma.RouteUpdateInput): Promise<RouteWithSites> {
    return this.prisma.route.update({ where: { id }, data, include: routeInclude });
  }

  softDelete(id: number): Promise<{ id: number }> {
    return this.prisma.route.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
