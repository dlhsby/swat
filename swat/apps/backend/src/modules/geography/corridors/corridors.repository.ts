import { Injectable } from '@nestjs/common';
import { Prisma, type Corridor } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CorridorWriteData {
  readonly name: string;
  readonly pathGeojson: Prisma.InputJsonValue;
  readonly waypoints: Prisma.InputJsonValue | null;
  readonly toleranceMeters: number;
  readonly lengthMeters: number;
  readonly source: string;
}

@Injectable()
export class CorridorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  routeExists(routeId: string): Promise<{ id: string } | null> {
    return this.prisma.route.findFirst({
      where: { id: routeId, deletedAt: null },
      select: { id: true },
    });
  }

  /** A route's site coordinates — for seeding the auto-created default corridor. */
  routeEndpoints(routeId: string): Promise<{
    originSite: { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null };
    destinationSite: { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null };
  } | null> {
    return this.prisma.route.findFirst({
      where: { id: routeId },
      select: {
        originSite: { select: { latitude: true, longitude: true } },
        destinationSite: { select: { latitude: true, longitude: true } },
      },
    });
  }

  listForRoute(routeId: string): Promise<Corridor[]> {
    return this.prisma.corridor.findMany({
      where: { routeId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  findById(id: string): Promise<Corridor | null> {
    return this.prisma.corridor.findFirst({ where: { id, deletedAt: null } });
  }

  hasAny(routeId: string): Promise<boolean> {
    return this.prisma.corridor
      .findFirst({ where: { routeId, deletedAt: null }, select: { id: true } })
      .then((c) => c !== null);
  }

  /** A route's active default corridor, if any. */
  findDefault(routeId: string): Promise<Corridor | null> {
    return this.prisma.corridor.findFirst({
      where: { routeId, isDefault: true, deletedAt: null },
    });
  }

  create(routeId: string, data: CorridorWriteData, isDefault: boolean): Promise<Corridor> {
    return this.prisma.corridor.create({
      data: {
        routeId,
        isDefault,
        name: data.name,
        pathGeojson: data.pathGeojson,
        waypoints: data.waypoints ?? Prisma.JsonNull,
        toleranceMeters: data.toleranceMeters,
        lengthMeters: data.lengthMeters,
        source: data.source,
      } satisfies Prisma.CorridorUncheckedCreateInput,
    });
  }

  update(id: string, data: Partial<CorridorWriteData>): Promise<Corridor> {
    const patch: Prisma.CorridorUncheckedUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.pathGeojson !== undefined) patch.pathGeojson = data.pathGeojson;
    if (data.waypoints !== undefined) patch.waypoints = data.waypoints ?? Prisma.JsonNull;
    if (data.toleranceMeters !== undefined) patch.toleranceMeters = data.toleranceMeters;
    if (data.lengthMeters !== undefined) patch.lengthMeters = data.lengthMeters;
    if (data.source !== undefined) patch.source = data.source;
    return this.prisma.corridor.update({ where: { id }, data: patch });
  }

  async softDelete(id: string): Promise<Corridor | null> {
    const existing = await this.prisma.corridor.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return null;
    }
    return this.prisma.corridor.update({ where: { id }, data: { deletedAt: new Date() } });
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
