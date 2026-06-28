import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

/** A resolved device: which vehicle an inbound IMEI belongs to. */
export interface DeviceRef {
  readonly id: string;
  readonly vehicleId: string;
  readonly imei: string;
}

/** Latest fix for a device, used to refresh its denormalized last-known position. */
export interface DevicePositionUpdate {
  readonly deviceId: string;
  readonly lastPingAt: Date;
  readonly lastLat: number;
  readonly lastLng: number;
  readonly lastSpeedKmh: number;
  readonly lastHeading: number | null;
}

/** A device flipped offline by the sweep — published as a status change. */
export interface OfflinedDevice {
  readonly id: string;
  readonly vehicleId: string;
}

@Injectable()
export class GpsPingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve active devices for a set of inbound IMEIs (keyed by imei). */
  async findActiveDevicesByImei(imeis: readonly string[]): Promise<Map<string, DeviceRef>> {
    if (imeis.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.gpsDevice.findMany({
      where: { imei: { in: [...imeis] }, active: true },
      select: { id: true, vehicleId: true, imei: true },
      orderBy: { priority: 'asc' },
    });
    const map = new Map<string, DeviceRef>();
    for (const row of rows) {
      // Lowest-priority (preferred) device wins; orderBy asc means first seen wins.
      if (row.imei && !map.has(row.imei)) {
        map.set(row.imei, { id: row.id, vehicleId: row.vehicleId, imei: row.imei });
      }
    }
    return map;
  }

  /**
   * Insert pings, ignoring duplicates on (recorded_at, imei) — `skipDuplicates`
   * compiles to ON CONFLICT DO NOTHING. The PostGIS `geog` column is computed by
   * the DB (it is not in the Prisma model). Returns the number actually inserted.
   */
  async insertPings(rows: Prisma.GpsPingCreateManyInput[]): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const result = await this.prisma.gpsPing.createMany({ data: rows, skipDuplicates: true });
    return result.count;
  }

  /** Park pings whose IMEI matched no device — never dropped (ops queue). */
  async parkUnmatched(rows: Prisma.GpsUnmatchedPingCreateManyInput[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.prisma.gpsUnmatchedPing.createMany({ data: rows });
  }

  /** Refresh a device's denormalized last-known position + mark it online. */
  async updateDevicePosition(update: DevicePositionUpdate): Promise<void> {
    await this.prisma.gpsDevice.update({
      where: { id: update.deviceId },
      data: {
        lastPingAt: update.lastPingAt,
        lastLat: update.lastLat,
        lastLng: update.lastLng,
        lastSpeedKmh: update.lastSpeedKmh,
        lastHeading: update.lastHeading,
        status: 'online',
      },
    });
  }

  /**
   * Flip currently-online devices to offline when their last ping is older than
   * the cutoff. Returns the devices that changed so the sweep can publish each
   * status change. Two-step (select then updateMany) so we know which flipped.
   */
  async markStaleDevicesOffline(cutoff: Date): Promise<OfflinedDevice[]> {
    const stale = await this.prisma.gpsDevice.findMany({
      where: { status: 'online', active: true, lastPingAt: { lt: cutoff } },
      select: { id: true, vehicleId: true },
    });
    if (stale.length === 0) {
      return [];
    }
    await this.prisma.gpsDevice.updateMany({
      where: { id: { in: stale.map((d) => d.id) } },
      data: { status: 'offline' },
    });
    return stale;
  }
}
