import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/** The corridor in force for a trip — its GeoJSON LineString + buffer width. */
export interface EffectiveCorridor {
  readonly geojson: unknown;
  readonly toleranceMeters: number;
  /**
   * Where it came from — a per-day Trip override, the Trip's chosen Corridor, or
   * the route's default corridor (Phase 7.8).
   */
  readonly source: 'trip-override' | 'corridor' | 'route-default';
}

/**
 * PostGIS corridor queries (Phase 7, T-708/T-711). All spatial work goes through
 * `$queryRaw` because Prisma 7 has no geometry type. Helpers build a
 * `geography` from a GeoJSON LineString ON THE FLY (`ST_GeomFromGeoJSON`), so they
 * work uniformly for a stored Route template AND a per-day Trip override (which has
 * no maintained geog column). An invalid geometry makes PostGIS raise — callers
 * map that to a 422.
 */
@Injectable()
export class CorridorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Geodesic length of a GeoJSON LineString in metres (ST_Length on geography). */
  async computeLengthMeters(geojson: unknown): Promise<number> {
    const json = JSON.stringify(geojson);
    const rows = await this.prisma.$queryRaw<Array<{ len: number }>>`
      SELECT ROUND(ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326)::geography))::int AS "len"
    `;
    return rows[0]?.len ?? 0;
  }

  /** True when the point is within `toleranceMeters` of the corridor (ST_DWithin). */
  async isPointWithinCorridor(
    geojson: unknown,
    lat: number,
    lng: number,
    toleranceMeters: number,
  ): Promise<boolean> {
    const json = JSON.stringify(geojson);
    const rows = await this.prisma.$queryRaw<Array<{ within: boolean }>>`
      SELECT ST_DWithin(
        ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${toleranceMeters}
      ) AS "within"
    `;
    return rows[0]?.within ?? false;
  }

  /** Shortest distance (metres) from the point to the corridor (ST_Distance). */
  async distanceToCorridorMeters(geojson: unknown, lat: number, lng: number): Promise<number> {
    const json = JSON.stringify(geojson);
    const rows = await this.prisma.$queryRaw<Array<{ dist: number }>>`
      SELECT ROUND(ST_Distance(
        ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ))::int AS "dist"
    `;
    return rows[0]?.dist ?? 0;
  }

  /**
   * Resolve the effective corridor for a trip (T-711): the per-day
   * `Trip.geometryOverride` wins; otherwise the route's `RouteGeometry` template;
   * otherwise null (a route without a drawn corridor — tracked, not corridor-checked).
   * Resolved at read/match time — never eager-copied at daily-init.
   */
  async resolveTripCorridor(tripId: string): Promise<EffectiveCorridor | null> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId },
      select: {
        geometryOverride: true,
        geometryToleranceM: true,
        corridor: { select: { pathGeojson: true, toleranceMeters: true, deletedAt: true } },
        // Fall back to the route's default corridor when the trip has no chosen one.
        route: {
          select: {
            corridors: {
              where: { isDefault: true, deletedAt: null },
              select: { pathGeojson: true, toleranceMeters: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!trip) {
      return null;
    }
    const routeDefault = trip.route?.corridors[0] ?? null;
    // 1. Per-day freehand override wins.
    if (trip.geometryOverride != null) {
      return {
        geojson: trip.geometryOverride,
        toleranceMeters:
          trip.geometryToleranceM ??
          trip.corridor?.toleranceMeters ??
          routeDefault?.toleranceMeters ??
          150,
        source: 'trip-override',
      };
    }
    // 2. The day's chosen Corridor (copied from the template at daily-init). A
    //    soft-deleted corridor is ignored → fall through to the route default.
    if (trip.corridor && trip.corridor.deletedAt == null) {
      return {
        geojson: trip.corridor.pathGeojson,
        toleranceMeters: trip.corridor.toleranceMeters,
        source: 'corridor',
      };
    }
    // 3. The route's default corridor.
    if (routeDefault) {
      return {
        geojson: routeDefault.pathGeojson,
        toleranceMeters: routeDefault.toleranceMeters,
        source: 'route-default',
      };
    }
    return null;
  }
}
