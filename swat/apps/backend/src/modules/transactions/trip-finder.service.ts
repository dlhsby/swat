import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, type RouteCategory, type Trip } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface FindOrCreateDisposalTripParams {
  readonly vehicleId: string;
  readonly transactionDayId: string;
  readonly operationDate: Date;
  readonly tpaSiteId: string;
  readonly tpaSiteName: string;
}

export interface DisposalTripResult {
  readonly trip: Trip;
  /** True when an ad-hoc trip was created (no planned DISPOSAL trip existed). */
  readonly created: boolean;
}

export interface CreateAdHocTripParams {
  readonly haulAssignmentId: string;
  /** Use an explicit route, or infer one from `category` + `destinationSiteId`. */
  readonly routeId?: string;
  readonly category?: RouteCategory;
  readonly destinationSiteId?: string;
  readonly name?: string;
  readonly createdById?: string;
}

/**
 * Creates ad-hoc (unscheduled) trips — the legacy parity for off-plan activity
 * the daily init never materialized. `createAdHocTrip` is the general primitive
 * (any route category); `findOrCreateDisposalTrip` is the weighbridge-specific
 * find-or-create that reuses it (Phase 4, T-407).
 */
@Injectable()
export class TripFinderService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create one unscheduled trip on an existing assignment, resolving its route. */
  async createAdHocTrip(params: CreateAdHocTripParams): Promise<Trip> {
    const assignment = await this.prisma.haulAssignment.findUnique({
      where: { id: params.haulAssignmentId },
      select: { id: true, operationDate: true },
    });
    if (!assignment) {
      throw new NotFoundException('Penugasan haul tidak ditemukan.');
    }

    const route = await this.resolveRoute(params);
    const name =
      params.name ??
      (route ? `${route.originSite.name} → ${route.destinationSite.name}` : 'Trip tak terjadwal');

    return this.prisma.trip.create({
      data: {
        haulAssignmentId: assignment.id,
        routeId: route?.id ?? null,
        operationDate: assignment.operationDate,
        status: 'IN_PROGRESS',
        name,
        ...(params.createdById ? { createdById: params.createdById } : {}),
      },
    });
  }

  /** Resolve the route from an explicit id, or infer it from category + destination. */
  private async resolveRoute(params: CreateAdHocTripParams): Promise<RouteWithSites | null> {
    if (params.routeId) {
      const route = await this.prisma.route.findFirst({
        where: { id: params.routeId, deletedAt: null },
        select: routeSelect,
      });
      if (!route) {
        throw new NotFoundException('Route tidak ditemukan.');
      }
      return route;
    }
    if (params.category && params.destinationSiteId) {
      const route = await this.prisma.route.findFirst({
        where: {
          category: params.category,
          destinationSiteId: params.destinationSiteId,
          deletedAt: null,
        },
        select: routeSelect,
      });
      if (!route) {
        throw new NotFoundException('Route untuk kategori dan tujuan ini tidak ditemukan.');
      }
      return route;
    }
    throw new BadRequestException('Sertakan routeId, atau category dengan destinationSiteId.');
  }

  async findOrCreateDisposalTrip(
    params: FindOrCreateDisposalTripParams,
  ): Promise<DisposalTripResult> {
    const haul = await this.prisma.haul.findFirst({
      where: { transactionDayId: params.transactionDayId, vehicleId: params.vehicleId },
      include: {
        assignments: {
          include: { trips: { include: { route: { select: { category: true } } } } },
        },
      },
    });
    if (!haul) {
      throw new NotFoundException('Haul tidak ditemukan untuk kendaraan dan tanggal ini');
    }

    const existing = haul.assignments
      .flatMap((assignment) => assignment.trips)
      .find((trip) => trip.route?.category === 'DISPOSAL' && trip.status !== 'VERIFIED');
    if (existing) {
      return { trip: existing, created: false };
    }

    const assignment = haul.assignments[0];
    if (!assignment) {
      throw new NotFoundException('Haul tidak memiliki penugasan untuk kendaraan ini');
    }

    const trip = await this.createAdHocTrip({
      haulAssignmentId: assignment.id,
      category: 'DISPOSAL',
      destinationSiteId: params.tpaSiteId,
      name: `Pembuangan ke ${params.tpaSiteName}`,
    });
    return { trip, created: true };
  }
}

const routeSelect = {
  id: true,
  originSite: { select: { name: true } },
  destinationSite: { select: { name: true } },
} satisfies Prisma.RouteSelect;

type RouteWithSites = Prisma.RouteGetPayload<{ select: typeof routeSelect }>;
