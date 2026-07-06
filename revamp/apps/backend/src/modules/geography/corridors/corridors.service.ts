import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { type Corridor, type Prisma } from '@prisma/client';

import { assertLineString, InvalidGeometryError } from '../../integrations/gps/geojson';

import { CorridorsRepository } from './corridors.repository';
import { type CreateCorridorDto } from './dto/create-corridor.dto';
import { type UpdateCorridorDto } from './dto/update-corridor.dto';
import { GoogleDirectionsService } from './google-directions.service';

/** Result of a bulk default-corridor backfill (the "Backfill default corridors" action). */
export interface BackfillCorridorsResult {
  readonly totalRoutes: number;
  readonly created: number;
  readonly snapped: number;
  readonly straightLine: number;
  /** Routes skipped because an endpoint has no / out-of-range coordinates. */
  readonly skippedNoCoords: number;
  /** Routes that threw — with a sample message so the real cause is visible, not hidden. */
  readonly errored: number;
  readonly sampleError: string | null;
}

/** A latitude/longitude is usable for a corridor only inside the WGS84 valid range. */
function coordInRange(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export interface CorridorDto {
  readonly id: string;
  readonly routeId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly pathGeojson: unknown;
  readonly waypoints: unknown | null;
  readonly toleranceMeters: number;
  readonly lengthMeters: number;
  readonly source: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(c: Corridor): CorridorDto {
  return {
    id: c.id,
    routeId: c.routeId,
    name: c.name,
    isDefault: c.isDefault,
    pathGeojson: c.pathGeojson,
    waypoints: c.waypoints ?? null,
    toleranceMeters: c.toleranceMeters,
    lengthMeters: c.lengthMeters,
    source: c.source,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

@Injectable()
export class CorridorsService {
  private readonly logger = new Logger(CorridorsService.name);

  constructor(
    private readonly repo: CorridorsRepository,
    private readonly directions: GoogleDirectionsService,
  ) {}

  async listForRoute(routeId: string): Promise<CorridorDto[]> {
    await this.assertRoute(routeId);
    // Lazily backfill the default corridor the first time a route is opened, so
    // legacy/imported routes (created without going through `RoutesService.create`)
    // also get one. Idempotent — skipped when the route already has corridors.
    await this.ensureDefaultForRoute(routeId);
    const rows = await this.repo.listForRoute(routeId);
    return rows.map(toDto);
  }

  async create(routeId: string, dto: CreateCorridorDto): Promise<CorridorDto> {
    await this.assertRoute(routeId);
    const line = this.validateGeometry(dto.pathGeojson);
    const lengthMeters = await this.lengthOrThrow(line);
    // The first corridor of a route becomes its default.
    const isDefault = !(await this.repo.hasAny(routeId));
    const corridor = await this.repo.create(
      routeId,
      {
        name: dto.name.trim(),
        pathGeojson: line as unknown as Prisma.InputJsonValue,
        waypoints: (dto.waypoints ?? null) as Prisma.InputJsonValue | null,
        toleranceMeters: dto.toleranceMeters ?? 150,
        lengthMeters,
        source: dto.source ?? 'google-maps',
      },
      isDefault,
    );
    await this.syncRouteDistance(routeId);
    return toDto(corridor);
  }

  /**
   * Keep the route's denormalized `distanceKm` in step with its **default corridor's
   * length** — the corridor (snapped or not) is the source of truth for distance.
   * Called after every corridor mutation. 0 km when the route has no default.
   */
  private async syncRouteDistance(routeId: string): Promise<void> {
    const def = await this.repo.findDefault(routeId);
    await this.repo.setRouteDistanceKm(routeId, def ? Math.round(def.lengthMeters / 1000) : 0);
  }

  async update(id: string, dto: UpdateCorridorDto): Promise<CorridorDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Koridor tidak ditemukan.');
    }
    let lengthMeters: number | undefined;
    let pathGeojson: Prisma.InputJsonValue | undefined;
    if (dto.pathGeojson !== undefined) {
      const line = this.validateGeometry(dto.pathGeojson);
      lengthMeters = await this.lengthOrThrow(line);
      pathGeojson = line as unknown as Prisma.InputJsonValue;
    }
    const corridor = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(pathGeojson !== undefined ? { pathGeojson } : {}),
      ...(lengthMeters !== undefined ? { lengthMeters } : {}),
      ...(dto.waypoints !== undefined
        ? { waypoints: (dto.waypoints ?? null) as Prisma.InputJsonValue | null }
        : {}),
      ...(dto.toleranceMeters !== undefined ? { toleranceMeters: dto.toleranceMeters } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
    });
    // Editing/snapping the default corridor changes its length → resync the route.
    await this.syncRouteDistance(corridor.routeId);
    return toDto(corridor);
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new NotFoundException('Koridor tidak ditemukan.');
    }
    await this.syncRouteDistance(deleted.routeId);
    return { message: 'Koridor telah dihapus.' };
  }

  /**
   * Auto-create a route's default corridor: a **road-snapped** path between its two
   * Sites (Google Directions, server-side), falling back to a straight line when no
   * server key is set or Directions fails. Returns null (creates nothing) when either
   * site lacks coords — the route is still usable, just not corridor-checked.
   */
  async createDefaultForRoute(routeId: string): Promise<CorridorDto | null> {
    const ep = await this.repo.routeEndpoints(routeId);
    if (!ep) {
      return null;
    }
    const o = ep.originSite;
    const d = ep.destinationSite;
    if (o.latitude == null || o.longitude == null || d.latitude == null || d.longitude == null) {
      return null;
    }
    const origin = { lat: Number(o.latitude), lng: Number(o.longitude) };
    const dest = { lat: Number(d.latitude), lng: Number(d.longitude) };
    // Skip (don't error) when a stored coordinate is out of the WGS84 range — e.g. a
    // legacy row with lat/lng swapped. Building a corridor from it yields a nonsense
    // geometry rather than a useful path, so treat it like "no coords".
    if (!coordInRange(origin.lat, origin.lng) || !coordInRange(dest.lat, dest.lng)) {
      this.logger.warn(
        `Route ${routeId}: skipping default corridor — coordinate out of range ` +
          `(origin ${origin.lat},${origin.lng} / dest ${dest.lat},${dest.lng}).`,
      );
      return null;
    }
    const snapped = await this.directions.snapDrivingRoute(origin, dest);
    const coordinates: Array<[number, number]> = snapped ?? [
      [origin.lng, origin.lat],
      [dest.lng, dest.lat],
    ];
    const line = { type: 'LineString' as const, coordinates };
    const lengthMeters = await this.lengthOrThrow(line);
    // Persist the two Sites as the corridor's control points (not the dense snapped
    // vertices) so the editor loads 2 handles + reflects snap state, rather than
    // treating it as a legacy path-only corridor (toggle off, dozens of handles).
    const waypoints = [
      { lng: origin.lng, lat: origin.lat, snapped: Boolean(snapped) },
      { lng: dest.lng, lat: dest.lat, snapped: Boolean(snapped) },
    ];
    const corridor = await this.repo.create(
      routeId,
      {
        name: 'Jalur Utama',
        pathGeojson: line as unknown as Prisma.InputJsonValue,
        waypoints: waypoints as unknown as Prisma.InputJsonValue,
        toleranceMeters: 150,
        lengthMeters,
        source: snapped ? 'directions' : 'straight',
      },
      true,
    );
    await this.syncRouteDistance(routeId);
    return toDto(corridor);
  }

  /**
   * Create the default corridor only when the route has none yet (idempotent) —
   * used to lazily backfill legacy routes on first open. Returns null when a
   * default already exists or neither site has coordinates.
   */
  async ensureDefaultForRoute(routeId: string): Promise<CorridorDto | null> {
    if (await this.repo.hasAny(routeId)) {
      return null;
    }
    return this.createDefaultForRoute(routeId);
  }

  /**
   * Explicit, user-triggered counterpart to the lazy `listForRoute` backfill — the
   * "Buat koridor default" action in the route's corridor sheet. Same idempotent
   * logic (skips if a corridor already exists), but validates the route exists
   * first so a bad id 404s instead of silently no-oping.
   */
  async backfillDefault(routeId: string): Promise<CorridorDto | null> {
    await this.assertRoute(routeId);
    return this.ensureDefaultForRoute(routeId);
  }

  /**
   * Replace the route's default corridor with a fresh one — used when a route's
   * endpoints change so the auto-default tracks the new sites. Soft-deletes the
   * old default (alternates are kept) and recreates it. Returns null when neither
   * site has coordinates.
   */
  async regenerateDefaultForRoute(routeId: string): Promise<CorridorDto | null> {
    const existing = await this.repo.findDefault(routeId);
    if (existing) {
      await this.repo.softDelete(existing.id);
    }
    return this.createDefaultForRoute(routeId);
  }

  private async assertRoute(routeId: string): Promise<void> {
    if (!(await this.repo.routeExists(routeId))) {
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

  private async lengthOrThrow(line: unknown): Promise<number> {
    try {
      return await this.repo.computeLengthMeters(line);
    } catch (err) {
      // Surface the real cause (e.g. a PostGIS error) instead of hiding it behind a
      // generic message — that opacity is what made a bulk backfill misreport every
      // failure as "no coords". Logged in full; the API message carries a short hint.
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Corridor length computation failed: ${detail}`);
      throw new UnprocessableEntityException(`Geometri koridor tidak valid: ${detail}`);
    }
  }

  /**
   * Bulk "backfill default corridors".
   *
   * `reset` (default **true**) → for every route whose two Sites have coordinates,
   * soft-delete the existing default corridor and regenerate it **road-snapped**
   * (Google Directions, straight-line fallback). This is what re-snaps every route
   * after a Maps key is (re)configured or sites move — it deletes and recreates, so
   * re-running always reflects the latest snap. Manual alternate corridors are kept.
   *
   * `reset = false` → additive/idempotent legacy behavior: only routes that currently
   * lack any corridor; existing corridors are left untouched.
   *
   * Per-route failures are counted and a sample message returned, so a stuck route is
   * visible rather than silently swallowed.
   */
  async backfillAll(reset = true): Promise<BackfillCorridorsResult> {
    const routeIds = reset
      ? await this.repo.routeIdsWithCoords()
      : await this.repo.routeIdsWithoutCorridor();
    let created = 0;
    let snapped = 0;
    let straightLine = 0;
    let skippedNoCoords = 0;
    let errored = 0;
    let sampleError: string | null = null;

    const CONCURRENCY = 8; // bounded so a road-snapping run doesn't hammer Google/DB.
    for (let i = 0; i < routeIds.length; i += CONCURRENCY) {
      await Promise.all(
        routeIds.slice(i, i + CONCURRENCY).map(async (routeId) => {
          try {
            const corridor = reset
              ? await this.regenerateDefaultForRoute(routeId)
              : await this.createDefaultForRoute(routeId);
            if (!corridor) {
              skippedNoCoords += 1;
              return;
            }
            created += 1;
            if (corridor.source === 'directions') snapped += 1;
            else straightLine += 1;
          } catch (err) {
            errored += 1;
            if (sampleError === null) {
              sampleError = err instanceof Error ? err.message : String(err);
            }
          }
        }),
      );
    }

    this.logger.log(
      `Corridor backfill (${reset ? 'reset' : 'additive'}): ${created} ` +
        `${reset ? 'regenerated' : 'created'} (${snapped} snapped, ${straightLine} straight), ` +
        `${skippedNoCoords} skipped (no/invalid coords), ${errored} errored` +
        (sampleError ? ` — e.g. ${sampleError}` : '') +
        ` of ${routeIds.length} routes.`,
    );
    return {
      totalRoutes: routeIds.length,
      created,
      snapped,
      straightLine,
      skippedNoCoords,
      errored,
      sampleError,
    };
  }
}
