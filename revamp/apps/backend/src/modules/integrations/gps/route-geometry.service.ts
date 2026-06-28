import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { type Prisma, type RouteGeometry } from '@prisma/client';

import { CorridorRepository } from './corridor.repository';
import { type UpsertRouteGeometryDto } from './dto/upsert-route-geometry.dto';
import { type UpsertTripGeometryDto } from './dto/upsert-trip-geometry.dto';
import { assertLineString, InvalidGeometryError } from './geojson';
import { RouteGeometryRepository } from './route-geometry.repository';

export interface RouteGeometryDto {
  readonly routeId: string;
  readonly pathGeojson: unknown;
  readonly waypoints: unknown | null;
  readonly toleranceMeters: number;
  readonly lengthMeters: number;
  readonly source: string;
  readonly updatedAt: string;
}

export interface TripGeometryDto {
  readonly tripId: string;
  readonly routeId: string | null;
  /** The route corridor chosen for this day (null ⇒ the route default applies). */
  readonly corridorId: string | null;
  readonly corridorName: string | null;
  /** True when a one-off freehand override is set (it wins over the named corridor). */
  readonly hasOverride: boolean;
  readonly pathGeojson: unknown | null;
  readonly waypoints: unknown | null;
  readonly toleranceMeters: number | null;
}

function toDto(g: RouteGeometry): RouteGeometryDto {
  return {
    routeId: g.routeId,
    pathGeojson: g.pathGeojson,
    waypoints: g.waypoints ?? null,
    toleranceMeters: g.toleranceMeters,
    lengthMeters: g.lengthMeters,
    source: g.source,
    updatedAt: g.updatedAt.toISOString(),
  };
}

@Injectable()
export class RouteGeometryService {
  constructor(
    private readonly repo: RouteGeometryRepository,
    private readonly corridor: CorridorRepository,
  ) {}

  async getTemplate(routeId: string): Promise<RouteGeometryDto | null> {
    await this.assertRoute(routeId);
    const geometry = await this.repo.findByRouteId(routeId);
    return geometry ? toDto(geometry) : null;
  }

  async upsertTemplate(routeId: string, dto: UpsertRouteGeometryDto): Promise<RouteGeometryDto> {
    await this.assertRoute(routeId);
    const line = this.validateGeometry(dto.pathGeojson);
    const lengthMeters = await this.lengthOrThrow(line);
    const geometry = await this.repo.upsertTemplate(routeId, {
      pathGeojson: line as unknown as Prisma.InputJsonValue,
      waypoints: (dto.waypoints ?? null) as Prisma.InputJsonValue | null,
      toleranceMeters: dto.toleranceMeters ?? 150,
      lengthMeters,
      source: dto.source ?? 'google-maps',
    });
    return toDto(geometry);
  }

  async deleteTemplate(routeId: string): Promise<{ message: string }> {
    await this.assertRoute(routeId);
    const deleted = await this.repo.deleteTemplate(routeId);
    if (!deleted) {
      throw new NotFoundException('Koridor rute belum digambar.');
    }
    return { message: 'Koridor rute telah dihapus.' };
  }

  async getTripOverride(tripId: string): Promise<TripGeometryDto> {
    const trip = await this.repo.tripOverride(tripId);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    return {
      tripId,
      routeId: trip.routeId,
      corridorId: trip.corridorId,
      corridorName: trip.corridor?.name ?? null,
      hasOverride: trip.geometryOverride != null,
      pathGeojson: trip.geometryOverride ?? null,
      waypoints: trip.geometryWaypoints ?? null,
      toleranceMeters: trip.geometryToleranceM,
    };
  }

  /**
   * Pick one of the trip's route corridors for this single day (or `null` to track
   * the route default). Clears any freehand override so the chosen corridor wins.
   */
  async setTripCorridor(tripId: string, corridorId: string | null): Promise<TripGeometryDto> {
    const trip = await this.repo.tripOverride(tripId);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    if (corridorId) {
      if (!trip.routeId) {
        throw new UnprocessableEntityException('Trip ini tidak terhubung ke rute.');
      }
      const owned = await this.repo.corridorInRoute(corridorId, trip.routeId);
      if (!owned) {
        throw new UnprocessableEntityException('Koridor bukan milik rute trip ini.');
      }
    }
    await this.repo.setTripCorridor(tripId, corridorId);
    return this.getTripOverride(tripId);
  }

  async setTripOverride(tripId: string, dto: UpsertTripGeometryDto): Promise<TripGeometryDto> {
    const trip = await this.repo.tripOverride(tripId);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    const line = this.validateGeometry(dto.pathGeojson);
    await this.lengthOrThrow(line); // validates via PostGIS
    await this.repo.setTripOverride(tripId, {
      geometryOverride: line as unknown as Prisma.InputJsonValue,
      waypoints: (dto.waypoints ?? null) as Prisma.InputJsonValue | null,
      toleranceMeters: dto.toleranceMeters ?? null,
    });
    return this.getTripOverride(tripId);
  }

  async clearTripOverride(tripId: string): Promise<{ message: string }> {
    const trip = await this.repo.tripOverride(tripId);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    await this.repo.clearTripOverride(tripId);
    return { message: 'Override koridor harian telah dihapus.' };
  }

  private async assertRoute(routeId: string): Promise<void> {
    const route = await this.repo.routeExists(routeId);
    if (!route) {
      throw new NotFoundException('Rute tidak ditemukan.');
    }
  }

  private validateGeometry(geojson: unknown): ReturnType<typeof assertLineString> {
    try {
      return assertLineString(geojson);
    } catch (err) {
      if (err instanceof InvalidGeometryError) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }

  /** Compute corridor length; a geometry PostGIS rejects → 422. */
  private async lengthOrThrow(line: unknown): Promise<number> {
    try {
      return await this.corridor.computeLengthMeters(line);
    } catch {
      throw new UnprocessableEntityException('Geometri koridor tidak valid.');
    }
  }
}
