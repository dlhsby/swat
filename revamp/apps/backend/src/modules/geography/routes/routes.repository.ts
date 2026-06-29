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
  readonly originSiteId?: string;
  readonly destinationSiteId?: string;
  readonly search?: string;
}

@Injectable()
export class RoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListRoutesFilter): Prisma.RouteWhereInput {
    const search = filter.search?.trim();
    return {
      deletedAt: null,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.originSiteId ? { originSiteId: filter.originSiteId } : {}),
      ...(filter.destinationSiteId ? { destinationSiteId: filter.destinationSiteId } : {}),
      ...(search
        ? {
            OR: [
              { originSite: { name: { contains: search, mode: 'insensitive' } } },
              { destinationSite: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
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

  findById(id: string): Promise<RouteWithSites | null> {
    return this.prisma.route.findFirst({ where: { id, deletedAt: null }, include: routeInclude });
  }

  /**
   * Slim projection of every active route for the record board: just the fields it
   * derives location suggestions + route resolution from. One query, no pagination
   * — so the board makes a single small request instead of paging the full table.
   */
  boardSummary(): Promise<
    {
      id: string;
      category: RouteCategory;
      originSite: { name: string };
      destinationSite: { name: string };
    }[]
  > {
    return this.prisma.route.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        category: true,
        originSite: { select: { name: true } },
        destinationSite: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  /** Active duplicate of the unique (origin, destination, category) triple. */
  findDuplicate(
    originSiteId: string,
    destinationSiteId: string,
    category: RouteCategory,
    excludeId?: string,
  ): Promise<{ id: string } | null> {
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

  siteExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.RouteCreateInput): Promise<RouteWithSites> {
    return this.prisma.route.create({ data, include: routeInclude });
  }

  update(id: string, data: Prisma.RouteUpdateInput): Promise<RouteWithSites> {
    return this.prisma.route.update({ where: { id }, data, include: routeInclude });
  }

  softDelete(id: string): Promise<{ id: string }> {
    return this.prisma.route.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
