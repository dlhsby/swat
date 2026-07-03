import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../config';
import { CacheService } from '../../cache/cache.service';

import { type MatchPing } from './deviation-matcher.service';
import {
  type ActivityTrip,
  type GeoSite,
  GpsActivityRepository,
  type HaulContext,
} from './gps-activity.repository';

/** How long the "currently inside site X" marker survives without pings (2 h). */
const INSIDE_TTL_SEC = 7200;
const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres between two lat/lng points. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * GPS activity state machine (Phase 7). Runs per persisted ping for a tracked
 * vehicle, alongside the deviation matcher. Detects geofence enter/exit of the
 * active haul's sites and drives the lifecycle:
 *
 *   leave POOL → DEPART (departActualTime)
 *   enter TPS/SPBU/TPA → ARRIVE (trip.arrivedAt, status ARRIVED)
 *   leave TPS/SPBU/TPA → COMPLETE (trip.actualTime, status DONE)
 *   enter POOL after departing → RETURN (returnActualTime, assignment DONE)
 *
 * Each transition also appends a GpsActivityEvent. "Inside which site" is tracked
 * in a Redis marker; all stamps are idempotent (only the first crossing writes),
 * so replays/overlapping pulls are safe. Graceful: no active haul → no-op; a site
 * without coordinates is simply never "entered". The TPA "timbang" (WEIGH) event
 * is emitted separately by the weighbridge integration, not from GPS dwell.
 */
@Injectable()
export class GpsActivityService {
  constructor(
    private readonly repo: GpsActivityRepository,
    private readonly cache: CacheService,
    private readonly config: AppConfigService,
  ) {}

  async track(ping: MatchPing): Promise<void> {
    const operationDate = new Date(
      Date.UTC(
        ping.recordedAt.getUTCFullYear(),
        ping.recordedAt.getUTCMonth(),
        ping.recordedAt.getUTCDate(),
      ),
    );
    const ctx = await this.repo.loadContext(ping.vehicleId, operationDate);
    if (!ctx) {
      return; // No active haul — nothing to track.
    }

    const current = this.currentSite(ctx.sites, ping);
    const currentSiteId = current?.id ?? null;
    const key = `gps:inside:${ping.vehicleId}`;
    const prevSiteId = await this.cache.get<string>(key);
    if (currentSiteId === prevSiteId) {
      return; // No geofence crossing.
    }

    if (prevSiteId) {
      const prev = ctx.sites.find((s) => s.id === prevSiteId);
      if (prev) {
        await this.handleExit(prev, ctx, ping);
      }
    }
    if (current) {
      await this.handleEnter(current, ctx, ping);
    }

    if (currentSiteId) {
      await this.cache.set(key, currentSiteId, INSIDE_TTL_SEC);
    } else {
      await this.cache.del(key);
    }
  }

  /** The nearest candidate site whose geofence contains the ping, else null. */
  private currentSite(sites: readonly GeoSite[], ping: MatchPing): GeoSite | null {
    let best: GeoSite | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const s of sites) {
      if (s.latitude === null || s.longitude === null) {
        continue;
      }
      const dist = haversineMeters(ping.latitude, ping.longitude, s.latitude, s.longitude);
      const radius = s.geofenceRadiusM ?? this.config.gpsGeofenceDefaultRadiusM;
      if (dist <= radius && dist < bestDist) {
        best = s;
        bestDist = dist;
      }
    }
    return best;
  }

  private async handleEnter(site: GeoSite, ctx: HaulContext, ping: MatchPing): Promise<void> {
    if (site.type === 'POOL') {
      // Entering the pool only means "returned" once the haul has departed;
      // the initial at-pool state raises nothing.
      if (ctx.departActualTime && !ctx.returnActualTime) {
        if (await this.repo.stampReturn(ctx.assignmentId, ping.recordedAt)) {
          await this.emit(ctx, ping, site, 'RETURN', null);
        }
      }
      return;
    }
    const trip = this.tripForSite(ctx, site.id, ['IN_PROGRESS']);
    if (trip && (await this.repo.stampArrive(trip.id, ping.recordedAt))) {
      await this.emit(ctx, ping, site, 'ARRIVE', trip.id);
    }
  }

  private async handleExit(site: GeoSite, ctx: HaulContext, ping: MatchPing): Promise<void> {
    if (site.type === 'POOL') {
      // Leaving the pool for the first time is the departure.
      if (!ctx.departActualTime) {
        if (await this.repo.stampDepart(ctx.assignmentId, ping.recordedAt)) {
          await this.emit(ctx, ping, site, 'DEPART', null);
        }
      }
      return;
    }
    const trip = this.tripForSite(ctx, site.id, ['ARRIVED', 'IN_PROGRESS']);
    if (trip && (await this.repo.stampComplete(trip.id, ping.recordedAt))) {
      await this.emit(ctx, ping, site, 'COMPLETE', trip.id);
    }
  }

  /** The active leg arriving at this site (first matching status). */
  private tripForSite(
    ctx: HaulContext,
    siteId: string,
    statuses: readonly string[],
  ): ActivityTrip | undefined {
    return ctx.trips.find((t) => t.destinationSiteId === siteId && statuses.includes(t.status));
  }

  private async emit(
    ctx: HaulContext,
    ping: MatchPing,
    site: GeoSite,
    kind: 'DEPART' | 'ARRIVE' | 'COMPLETE' | 'RETURN',
    tripId: string | null,
  ): Promise<void> {
    await this.repo.writeEvent({
      vehicleId: ping.vehicleId,
      haulId: ctx.haulId,
      haulAssignmentId: ctx.assignmentId,
      tripId,
      siteId: site.id,
      siteType: site.type,
      kind,
      source: 'GPS',
      latitude: ping.latitude,
      longitude: ping.longitude,
      occurredAt: ping.recordedAt,
    });
  }
}
