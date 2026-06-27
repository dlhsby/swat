import { Injectable } from '@nestjs/common';
import { Prisma, type RouteGeometry } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RouteGeometryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRouteId(routeId: string): Promise<RouteGeometry | null> {
    return this.prisma.routeGeometry.findUnique({ where: { routeId } });
  }

  routeExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.route.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  /** Create or replace a route's corridor template (one per route). */
  upsertTemplate(
    routeId: string,
    data: {
      pathGeojson: Prisma.InputJsonValue;
      waypoints: Prisma.InputJsonValue | null;
      toleranceMeters: number;
      lengthMeters: number;
      source: string;
    },
  ): Promise<RouteGeometry> {
    // `null` clears the column; Prisma requires the explicit JsonNull sentinel.
    const waypoints = data.waypoints ?? Prisma.JsonNull;
    return this.prisma.routeGeometry.upsert({
      where: { routeId },
      update: {
        pathGeojson: data.pathGeojson,
        waypoints,
        toleranceMeters: data.toleranceMeters,
        lengthMeters: data.lengthMeters,
        source: data.source,
      },
      create: {
        route: { connect: { id: routeId } },
        pathGeojson: data.pathGeojson,
        waypoints,
        toleranceMeters: data.toleranceMeters,
        lengthMeters: data.lengthMeters,
        source: data.source,
      },
    });
  }

  async deleteTemplate(routeId: string): Promise<boolean> {
    const existing = await this.prisma.routeGeometry.findUnique({
      where: { routeId },
      select: { id: true },
    });
    if (!existing) {
      return false;
    }
    await this.prisma.routeGeometry.delete({ where: { routeId } });
    return true;
  }

  // --- Per-day Trip override -----------------------------------------------

  tripOverride(tripId: string): Promise<{
    geometryOverride: Prisma.JsonValue;
    geometryWaypoints: Prisma.JsonValue;
    geometryToleranceM: number | null;
  } | null> {
    return this.prisma.trip.findFirst({
      where: { id: tripId },
      select: { geometryOverride: true, geometryWaypoints: true, geometryToleranceM: true },
    });
  }

  async setTripOverride(
    tripId: string,
    data: {
      geometryOverride: Prisma.InputJsonValue;
      waypoints: Prisma.InputJsonValue | null;
      toleranceMeters: number | null;
    },
  ): Promise<void> {
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        geometryOverride: data.geometryOverride,
        // `null` clears the column; Prisma requires the explicit JsonNull sentinel.
        geometryWaypoints: data.waypoints ?? Prisma.JsonNull,
        geometryToleranceM: data.toleranceMeters,
      },
    });
  }

  async clearTripOverride(tripId: string): Promise<void> {
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        geometryOverride: Prisma.DbNull,
        geometryWaypoints: Prisma.DbNull,
        geometryToleranceM: null,
      },
    });
  }
}
