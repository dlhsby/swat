import { Injectable } from '@nestjs/common';
import { type GpsDevice, type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export interface ListGpsDevicesFilter extends PageParams {
  readonly vehicleId?: string;
  readonly status?: string;
  readonly active?: boolean;
  readonly search?: string;
}

const deviceInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
} satisfies Prisma.GpsDeviceInclude;

export type GpsDeviceWithVehicle = Prisma.GpsDeviceGetPayload<{ include: typeof deviceInclude }>;

@Injectable()
export class GpsDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListGpsDevicesFilter): Prisma.GpsDeviceWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.search
        ? {
            OR: [
              { deviceId: { contains: filter.search, mode: 'insensitive' } },
              { imei: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(
    filter: ListGpsDevicesFilter,
  ): Promise<{ rows: GpsDeviceWithVehicle[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.gpsDevice.findMany({
        where,
        include: deviceInclude,
        orderBy: [{ vehicleId: 'asc' }, { priority: 'asc' }],
        skip,
        take,
      }),
      this.prisma.gpsDevice.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<GpsDeviceWithVehicle | null> {
    return this.prisma.gpsDevice.findUnique({ where: { id }, include: deviceInclude });
  }

  /** deviceId is globally unique (the IMEI for hardware) — the dedup key on create. */
  findByDeviceId(deviceId: string): Promise<{ id: string } | null> {
    return this.prisma.gpsDevice.findUnique({ where: { deviceId }, select: { id: true } });
  }

  /** The one active hardware tracker for a vehicle, if any (partial unique index). */
  findActiveHardwareForVehicle(vehicleId: string): Promise<{ id: string } | null> {
    return this.prisma.gpsDevice.findFirst({
      where: { vehicleId, deviceType: 'gps-hardware', active: true },
      select: { id: true },
    });
  }

  vehicleExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.GpsDeviceCreateInput): Promise<GpsDeviceWithVehicle> {
    return this.prisma.gpsDevice.create({ data, include: deviceInclude });
  }

  update(id: string, data: Prisma.GpsDeviceUpdateInput): Promise<GpsDeviceWithVehicle> {
    return this.prisma.gpsDevice.update({ where: { id }, data, include: deviceInclude });
  }

  delete(id: string): Promise<GpsDevice> {
    return this.prisma.gpsDevice.delete({ where: { id } });
  }

  // --- Unmatched-IMEI queue -------------------------------------------------

  async listUnmatched(
    params: PageParams,
  ): Promise<{
    rows: Array<{ imei: string; count: number; lastReceivedAt: Date }>;
    total: number;
  }> {
    // Collapse the raw queue (one row per parked ping) to one entry per IMEI.
    const grouped = await this.prisma.gpsUnmatchedPing.groupBy({
      by: ['imei'],
      _count: { _all: true },
      _max: { receivedAt: true },
      orderBy: { _max: { receivedAt: 'desc' } },
    });
    const { skip, take } = toSkipTake(params);
    const page = grouped.slice(skip, skip + take).map((g) => ({
      imei: g.imei,
      count: g._count._all,
      lastReceivedAt: g._max.receivedAt ?? new Date(0),
    }));
    return { rows: page, total: grouped.length };
  }

  countUnmatchedForImei(imei: string): Promise<number> {
    return this.prisma.gpsUnmatchedPing.count({ where: { imei } });
  }

  deleteUnmatchedForImei(imei: string): Promise<{ count: number }> {
    return this.prisma.gpsUnmatchedPing.deleteMany({ where: { imei } });
  }
}
