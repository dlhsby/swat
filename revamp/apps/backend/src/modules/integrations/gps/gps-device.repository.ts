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

  /** All active vehicles' plates — used to match a GPS.id roster by plate number. */
  listVehiclePlates(): Promise<Array<{ id: string; plateNumber: string }>> {
    return this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true, plateNumber: true },
    });
  }

  /** Device lookup by its globally-unique deviceId (IMEI), with the fields the
   *  GPS.id sync needs to decide create vs. remap vs. unchanged. */
  findDeviceForSync(
    deviceId: string,
  ): Promise<{ id: string; vehicleId: string; active: boolean; deviceType: string } | null> {
    return this.prisma.gpsDevice.findUnique({
      where: { deviceId },
      select: { id: true, vehicleId: true, active: true, deviceType: true },
    });
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
    rows: Array<{ imei: string; count: number; lastReceivedAt: Date; vehicleNumber: string | null }>;
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
    const pageImeis = grouped.slice(skip, skip + take).map((g) => g.imei);
    // One payload sample per paged IMEI, to surface the reported plate as a hint.
    const samples = await this.prisma.gpsUnmatchedPing.findMany({
      where: { imei: { in: pageImeis } },
      distinct: ['imei'],
      select: { imei: true, payload: true },
    });
    const hintByImei = new Map(samples.map((s) => [s.imei, plateHint(s.payload)]));
    const page = grouped.slice(skip, skip + take).map((g) => ({
      imei: g.imei,
      count: g._count._all,
      lastReceivedAt: g._max.receivedAt ?? new Date(0),
      vehicleNumber: hintByImei.get(g.imei) ?? null,
    }));
    return { rows: page, total: grouped.length };
  }

  countUnmatchedForImei(imei: string): Promise<number> {
    return this.prisma.gpsUnmatchedPing.count({ where: { imei } });
  }

  deleteUnmatchedForImei(imei: string): Promise<{ count: number }> {
    return this.prisma.gpsUnmatchedPing.deleteMany({ where: { imei } });
  }

  /** All registered device ids (IMEIs) — for the sync to skip already-known IMEIs. */
  async listDeviceIds(): Promise<string[]> {
    const rows = await this.prisma.gpsDevice.findMany({ select: { deviceId: true } });
    return rows.map((r) => r.deviceId);
  }

  /** Distinct IMEIs already parked in the unmatched queue (dedup for the sync). */
  async listQueuedImeis(): Promise<string[]> {
    const rows = await this.prisma.gpsUnmatchedPing.findMany({
      distinct: ['imei'],
      select: { imei: true },
    });
    return rows.map((r) => r.imei);
  }

  /** Bulk-park unknown IMEIs in the queue (from the GPS.id roster sync). */
  addUnmatchedPings(
    rows: ReadonlyArray<{ imei: string; payload: Prisma.InputJsonValue }>,
  ): Promise<{ count: number }> {
    return this.prisma.gpsUnmatchedPing.createMany({ data: rows as Prisma.GpsUnmatchedPingCreateManyInput[] });
  }
}

/** Pull a display plate/number out of an unmatched-ping payload, if present. */
function plateHint(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    const value = p.VehicleNumber ?? p.plate ?? p.Plate;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}
