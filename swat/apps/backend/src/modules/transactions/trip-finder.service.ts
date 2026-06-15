import { Injectable, NotFoundException } from '@nestjs/common';
import { type Trip } from '@prisma/client';

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

/**
 * Resolves the DISPOSAL trip a weighing should attach to (Phase 4, T-407). Finds
 * the vehicle's Haul for the transaction day, then a non-VERIFIED DISPOSAL trip
 * among its assignments' trips. If none exists (an organic TPA arrival not in the
 * daily plan), creates an ad-hoc DISPOSAL trip on the primary assignment using the
 * inferred DISPOSAL route to the TPA site. Throws 404 when the Haul or a DISPOSAL
 * route to the TPA is missing.
 */
@Injectable()
export class TripFinderService {
  constructor(private readonly prisma: PrismaService) {}

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
    const route = await this.prisma.route.findFirst({
      where: { destinationSiteId: params.tpaSiteId, category: 'DISPOSAL', deletedAt: null },
      select: { id: true },
    });
    if (!route) {
      throw new NotFoundException('Route DISPOSAL untuk TPA tidak ditemukan');
    }

    const trip = await this.prisma.trip.create({
      data: {
        haulAssignmentId: assignment.id,
        routeId: route.id,
        operationDate: params.operationDate,
        status: 'IN_PROGRESS',
        name: `Pembuangan ke ${params.tpaSiteName}`,
      },
    });
    return { trip, created: true };
  }
}
