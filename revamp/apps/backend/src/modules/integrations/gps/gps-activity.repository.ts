import { Injectable } from '@nestjs/common';
import { type GpsActivityKind, type GpsActivitySource, type SiteType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

/** A candidate geofence site (a haul's origin/destination) with its centre + radius. */
export interface GeoSite {
  readonly id: string;
  readonly type: SiteType;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly geofenceRadiusM: number | null;
}

/** A leg of the active haul, keyed to its destination site. */
export interface ActivityTrip {
  readonly id: string;
  readonly status: string;
  readonly arrivedAt: Date | null;
  readonly actualTime: Date | null;
  readonly destinationSiteId: string | null;
}

/** The active-haul context needed to drive the activity state machine. */
export interface HaulContext {
  readonly haulId: string;
  readonly assignmentId: string;
  readonly departActualTime: Date | null;
  readonly returnActualTime: Date | null;
  readonly sites: GeoSite[];
  readonly trips: ActivityTrip[];
}

export interface ActivityEventInput {
  readonly vehicleId: string;
  readonly haulId: string;
  readonly haulAssignmentId?: string | null;
  readonly tripId?: string | null;
  readonly siteId?: string | null;
  readonly siteType?: SiteType | null;
  readonly kind: GpsActivityKind;
  readonly source?: GpsActivitySource;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly occurredAt: Date;
}

const siteSelect = {
  id: true,
  type: true,
  latitude: true,
  longitude: true,
  geofenceRadiusM: true,
} as const;

@Injectable()
export class GpsActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load the vehicle's in-progress haul for the operation date: its first
   * assignment (depart/return realization) and every leg with its destination
   * site, plus the deduped set of candidate geofence sites (origin + destination
   * across all legs). Returns null when there's no active haul.
   */
  async loadContext(vehicleId: string, operationDate: Date): Promise<HaulContext | null> {
    const haul = await this.prisma.haul.findFirst({
      where: { vehicleId, operationDate, status: 'IN_PROGRESS' },
      select: {
        id: true,
        assignments: {
          select: {
            id: true,
            departActualTime: true,
            returnActualTime: true,
            trips: {
              select: {
                id: true,
                status: true,
                arrivedAt: true,
                actualTime: true,
                route: {
                  select: {
                    destinationSite: { select: siteSelect },
                    originSite: { select: siteSelect },
                  },
                },
              },
            },
          },
        },
      },
    });
    const assignment = haul?.assignments[0];
    if (!haul || !assignment) {
      return null;
    }

    const sites = new Map<string, GeoSite>();
    const trips: ActivityTrip[] = [];
    for (const a of haul.assignments) {
      for (const t of a.trips) {
        const dest = t.route?.destinationSite ?? null;
        const origin = t.route?.originSite ?? null;
        for (const s of [dest, origin]) {
          if (s && !sites.has(s.id)) {
            sites.set(s.id, {
              id: s.id,
              type: s.type,
              latitude: s.latitude === null ? null : Number(s.latitude),
              longitude: s.longitude === null ? null : Number(s.longitude),
              geofenceRadiusM: s.geofenceRadiusM,
            });
          }
        }
        trips.push({
          id: t.id,
          status: t.status,
          arrivedAt: t.arrivedAt,
          actualTime: t.actualTime,
          destinationSiteId: dest?.id ?? null,
        });
      }
    }

    return {
      haulId: haul.id,
      assignmentId: assignment.id,
      departActualTime: assignment.departActualTime,
      returnActualTime: assignment.returnActualTime,
      sites: [...sites.values()],
      trips,
    };
  }

  /** Stamp departure from the pool (idempotent). Returns true if it changed. */
  async stampDepart(assignmentId: string, at: Date): Promise<boolean> {
    const r = await this.prisma.haulAssignment.updateMany({
      where: { id: assignmentId, departActualTime: null },
      data: { departActualTime: at },
    });
    return r.count > 0;
  }

  /** Stamp return to the pool + close the assignment (idempotent). */
  async stampReturn(assignmentId: string, at: Date): Promise<boolean> {
    const r = await this.prisma.haulAssignment.updateMany({
      where: { id: assignmentId, returnActualTime: null },
      data: { returnActualTime: at, status: 'DONE' },
    });
    return r.count > 0;
  }

  /** Stamp arrival at a leg's destination (idempotent): status → ARRIVED. */
  async stampArrive(tripId: string, at: Date): Promise<boolean> {
    const r = await this.prisma.trip.updateMany({
      where: { id: tripId, arrivedAt: null },
      data: { arrivedAt: at, status: 'ARRIVED' },
    });
    return r.count > 0;
  }

  /** Stamp completion of a leg on leaving the site (idempotent): status → DONE. */
  async stampComplete(tripId: string, at: Date): Promise<boolean> {
    const r = await this.prisma.trip.updateMany({
      where: { id: tripId, actualTime: null },
      data: { actualTime: at, status: 'DONE', realizationEntryAt: at },
    });
    return r.count > 0;
  }

  /**
   * Emit a WEIGH milestone for a trip's weighing (the TPA jembatan timbang),
   * resolving vehicle/haul from the trip. Source WEIGHBRIDGE, so the activity feed
   * shows real weigh events alongside the GPS-derived ones. Best-effort: a trip
   * with no haul link (e.g. an unmatched weighing) is skipped.
   */
  async writeWeighForTrip(tripId: string, occurredAt: Date): Promise<void> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        route: { select: { destinationSite: { select: { id: true, type: true } } } },
        haulAssignment: {
          select: { id: true, haul: { select: { id: true, vehicleId: true } } },
        },
      },
    });
    const assignment = trip?.haulAssignment;
    if (!assignment) {
      return;
    }
    await this.writeEvent({
      vehicleId: assignment.haul.vehicleId,
      haulId: assignment.haul.id,
      haulAssignmentId: assignment.id,
      tripId,
      siteId: trip.route?.destinationSite?.id ?? null,
      siteType: trip.route?.destinationSite?.type ?? 'TPA',
      kind: 'WEIGH',
      source: 'WEIGHBRIDGE',
      occurredAt,
    });
  }

  async writeEvent(e: ActivityEventInput): Promise<void> {
    await this.prisma.gpsActivityEvent.create({
      data: {
        vehicleId: e.vehicleId,
        haulId: e.haulId,
        haulAssignmentId: e.haulAssignmentId ?? null,
        tripId: e.tripId ?? null,
        siteId: e.siteId ?? null,
        siteType: e.siteType ?? null,
        kind: e.kind,
        source: e.source ?? 'GPS',
        latitude: e.latitude ?? null,
        longitude: e.longitude ?? null,
        occurredAt: e.occurredAt,
      },
    });
  }
}
