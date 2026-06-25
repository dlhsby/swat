import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { type Job } from 'bullmq';

import { GpsPingRepository, type DeviceRef } from './gps-ping.repository';
import { GpsPositionPublisher } from './gps-position.publisher';
import { type CanonicalPing, type GpsIngestJobData, GPS_INGEST_QUEUE } from './gps.types';

/**
 * Ingest worker (Phase 7, T-706). For each normalized ping in a job batch:
 *  - resolve IMEI → active device → vehicle (unknown IMEIs are PARKED in the
 *    unmatched queue, never dropped),
 *  - persist the ping (dedup on (recorded_at, imei) via ON CONFLICT DO NOTHING),
 *  - refresh the device's last-known position + flip it online,
 *  - publish the live position to `gps:positions`.
 * Retries/backoff come from the queue; the worker re-reads device state each job.
 * (Epic 7.3 will trigger the deviation matcher for the affected vehicles here.)
 */
@Processor(GPS_INGEST_QUEUE)
export class GpsIngestWorker extends WorkerHost {
  private readonly logger = new Logger(GpsIngestWorker.name);

  constructor(
    private readonly repo: GpsPingRepository,
    private readonly publisher: GpsPositionPublisher,
  ) {
    super();
  }

  async process(job: Job<GpsIngestJobData>): Promise<void> {
    const pings = job.data.pings ?? [];
    if (pings.length === 0) {
      return;
    }

    const imeis = [...new Set(pings.map((p) => p.imei))];
    const devices = await this.repo.findActiveDevicesByImei(imeis);

    const known: Array<{ ping: CanonicalPing; device: DeviceRef }> = [];
    const unknown: CanonicalPing[] = [];
    for (const ping of pings) {
      const device = devices.get(ping.imei);
      if (device) {
        known.push({ ping, device });
      } else {
        unknown.push(ping);
      }
    }

    if (unknown.length > 0) {
      await this.repo.parkUnmatched(
        unknown.map((p) => ({ imei: p.imei, payload: p as unknown as Prisma.InputJsonValue })),
      );
    }

    if (known.length === 0) {
      this.logger.debug(`gps-ingest: ${unknown.length} unmatched, 0 matched`);
      return;
    }

    const rows: Prisma.GpsPingCreateManyInput[] = known.map(({ ping, device }) => ({
      vehicleId: device.vehicleId,
      imei: ping.imei,
      latitude: ping.latitude,
      longitude: ping.longitude,
      speedKmh: ping.speedKmh,
      heading: ping.heading,
      engineOn: ping.engineOn,
      odometerM: BigInt(Math.max(0, Math.round(ping.odometerM))),
      source: ping.source,
      accuracyM: ping.accuracyM,
      recordedAt: new Date(ping.recordedAt),
    }));
    const inserted = await this.repo.insertPings(rows);

    // Refresh each device to its LATEST fix in the batch, then publish it.
    for (const { ping, device } of latestPerDevice(known)) {
      await this.repo.updateDevicePosition({
        deviceId: device.id,
        lastPingAt: new Date(ping.recordedAt),
        lastLat: ping.latitude,
        lastLng: ping.longitude,
        lastSpeedKmh: ping.speedKmh,
        lastHeading: ping.heading,
      });
      await this.publisher.publishPosition({
        vehicleId: device.vehicleId,
        imei: ping.imei,
        latitude: ping.latitude,
        longitude: ping.longitude,
        speedKmh: ping.speedKmh,
        heading: ping.heading,
        engineOn: ping.engineOn,
        recordedAt: ping.recordedAt,
        source: ping.source,
      });
    }

    this.logger.debug(
      `gps-ingest: ${inserted} inserted, ${unknown.length} unmatched, ${known.length} matched`,
    );
  }
}

/** The latest ping per device in a batch (by recordedAt). */
function latestPerDevice(
  items: ReadonlyArray<{ ping: CanonicalPing; device: DeviceRef }>,
): Array<{ ping: CanonicalPing; device: DeviceRef }> {
  const byDevice = new Map<string, { ping: CanonicalPing; device: DeviceRef }>();
  for (const item of items) {
    const current = byDevice.get(item.device.id);
    if (!current || item.ping.recordedAt > current.ping.recordedAt) {
      byDevice.set(item.device.id, item);
    }
  }
  return [...byDevice.values()];
}
