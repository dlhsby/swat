import { Injectable } from '@nestjs/common';
import { Prisma, RouteCategory } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const corridorInclude = {
  originSite: { select: { id: true, name: true, type: true } },
  destinationSite: { select: { id: true, name: true, type: true } },
} satisfies Prisma.CorridorInclude;

export type CorridorWithSites = Prisma.CorridorGetPayload<{ include: typeof corridorInclude }>;

export interface ListCorridorsFilter extends PageParams {
  readonly category?: RouteCategory;
  readonly originSiteId?: string;
  readonly destinationSiteId?: string;
  readonly search?: string;
}

export interface CorridorWriteData {
  readonly name: string;
  readonly pathGeojson: Prisma.InputJsonValue;
  readonly waypoints: Prisma.InputJsonValue | null;
  readonly toleranceMeters: number;
  readonly lengthMeters: number;
  readonly source: string;
  readonly category: RouteCategory | null;
  readonly originSiteId: string | null;
  readonly destinationSiteId: string | null;
}

@Injectable()
export class CorridorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListCorridorsFilter): Prisma.CorridorWhereInput {
    return {
      deletedAt: null,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.originSiteId ? { originSiteId: filter.originSiteId } : {}),
      ...(filter.destinationSiteId ? { destinationSiteId: filter.destinationSiteId } : {}),
      ...(filter.search ? { name: { contains: filter.search, mode: 'insensitive' as const } } : {}),
    };
  }

  async list(filter: ListCorridorsFilter): Promise<{ rows: CorridorWithSites[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.corridor.findMany({
        where,
        include: corridorInclude,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.corridor.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<CorridorWithSites | null> {
    return this.prisma.corridor.findFirst({
      where: { id, deletedAt: null },
      include: corridorInclude,
    });
  }

  create(data: CorridorWriteData): Promise<CorridorWithSites> {
    return this.prisma.corridor.create({
      data: {
        name: data.name,
        pathGeojson: data.pathGeojson,
        // `null` clears the column; Prisma needs the explicit JsonNull sentinel.
        waypoints: data.waypoints ?? Prisma.JsonNull,
        toleranceMeters: data.toleranceMeters,
        lengthMeters: data.lengthMeters,
        source: data.source,
        category: data.category,
        originSiteId: data.originSiteId,
        destinationSiteId: data.destinationSiteId,
      } satisfies Prisma.CorridorUncheckedCreateInput,
      include: corridorInclude,
    });
  }

  update(id: string, data: Partial<CorridorWriteData>): Promise<CorridorWithSites> {
    const patch: Prisma.CorridorUncheckedUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.pathGeojson !== undefined) patch.pathGeojson = data.pathGeojson;
    if (data.waypoints !== undefined) patch.waypoints = data.waypoints ?? Prisma.JsonNull;
    if (data.toleranceMeters !== undefined) patch.toleranceMeters = data.toleranceMeters;
    if (data.lengthMeters !== undefined) patch.lengthMeters = data.lengthMeters;
    if (data.source !== undefined) patch.source = data.source;
    if (data.category !== undefined) patch.category = data.category;
    if (data.originSiteId !== undefined) patch.originSiteId = data.originSiteId;
    if (data.destinationSiteId !== undefined) patch.destinationSiteId = data.destinationSiteId;
    return this.prisma.corridor.update({ where: { id }, data: patch, include: corridorInclude });
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await this.prisma.corridor.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return false;
    }
    await this.prisma.corridor.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  /** Corridor length in metres via PostGIS ST_Length (geodesic, WGS84). */
  async computeLengthMeters(geojson: unknown): Promise<number> {
    const json = JSON.stringify(geojson);
    const rows = await this.prisma.$queryRaw<Array<{ len: number }>>`
      SELECT ROUND(ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326)::geography))::int AS "len"
    `;
    return rows[0]?.len ?? 0;
  }
}
