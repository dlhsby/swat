import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const vehicleSelect = {
  id: true,
  plateNumber: true,
  gpsDevices: {
    where: { active: true, deviceType: 'gps-hardware' },
    select: {
      status: true,
      lastPingAt: true,
      lastLat: true,
      lastLng: true,
      lastSpeedKmh: true,
      lastHeading: true,
    },
    take: 1,
  },
} satisfies Prisma.VehicleSelect;

export type VehicleWithDevice = Prisma.VehicleGetPayload<{ select: typeof vehicleSelect }>;

const realizationSelect = {
  name: true,
  actualTime: true,
  targetTime: true,
  status: true,
  haulAssignment: { select: { haul: { select: { vehicleId: true } } } },
  route: {
    select: {
      destinationSite: { select: { name: true, latitude: true, longitude: true } },
    },
  },
} satisfies Prisma.TripSelect;

export type RealizationLeg = Prisma.TripGetPayload<{ select: typeof realizationSelect }>;

@Injectable()
export class VehiclePositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every active vehicle with its active hardware device (if any). */
  vehiclesWithDevice(): Promise<VehicleWithDevice[]> {
    return this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: vehicleSelect,
      orderBy: { plateNumber: 'asc' },
    });
  }

  /**
   * Today's realized + in-progress legs for the given (untracked) vehicles, with
   * destination-site coords. Ordered so the caller can pick the latest realized
   * leg, else the next in-progress one.
   */
  recordedActivity(vehicleIds: string[], operationDate: Date): Promise<RealizationLeg[]> {
    if (vehicleIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.trip.findMany({
      where: {
        operationDate,
        haulAssignment: { haul: { vehicleId: { in: vehicleIds } } },
        OR: [{ actualTime: { not: null } }, { status: 'IN_PROGRESS' }],
      },
      select: realizationSelect,
      orderBy: [{ actualTime: 'desc' }, { targetTime: 'asc' }],
    });
  }

  /** Recent breadcrumb track for a vehicle (last `minutes`). */
  recentTrack(
    vehicleId: string,
    since: Date,
  ): Promise<
    Array<{
      latitude: Prisma.Decimal;
      longitude: Prisma.Decimal;
      speedKmh: Prisma.Decimal;
      heading: number | null;
      recordedAt: Date;
    }>
  > {
    return this.prisma.gpsPing.findMany({
      where: { vehicleId, recordedAt: { gte: since } },
      select: { latitude: true, longitude: true, speedKmh: true, heading: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
      take: 5000,
    });
  }
}
