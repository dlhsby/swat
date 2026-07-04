import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { SystemConfigService } from '../../../config';

import { GpsEfficiencyRepository } from './gps-efficiency.repository';
import { GpsIngestQueue } from './gps-ingest.queue';
import { type CanonicalPing } from './gps.types';
import { type GpsidHistoryPoint, GpsidClientService } from './gpsid-client.service';

const INTERVAL_NAME = 'gpsid-position-pull';
/** Extra minutes pulled beyond the interval so a slow tick never leaves a gap. */
const OVERLAP_MIN = 5;

/**
 * Map a GPS.id history point onto a canonical ping. History carries no engine /
 * odometer / heading, so those default the same way the webhook normalizer does
 * for a minimal payload — the position + speed + time are what matter here.
 */
export function historyPointToPing(imei: string, p: GpsidHistoryPoint): CanonicalPing {
  return {
    imei,
    latitude: p.latitude,
    longitude: p.longitude,
    speedKmh: p.speedKmh,
    heading: null,
    engineOn: false,
    odometerM: 0,
    recordedAt: p.recordedAt,
    source: 'gpsid',
    accuracyM: null,
    reportedPlate: null,
  };
}

/**
 * Near-real-time GPS.id **position pull** (Phase 7 / Phase B). When `gpsid.positionPull`
 * is on and credentials are set, polls `report/history` per active device every
 * `gpsid.pullIntervalMin` minutes and feeds the positions through the SAME ingest
 * queue as the push webhook. Settings come from {@link SystemConfigService} (DB → env
 * → default); the interval re-registers on the fly when they change. No-ops cleanly
 * when disabled or unconfigured; duplicate points are dropped by the ping repo.
 */
@Injectable()
export class GpsPositionPullJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GpsPositionPullJob.name);
  private handle: NodeJS.Timeout | null = null;

  constructor(
    private readonly systemConfig: SystemConfigService,
    private readonly gpsid: GpsidClientService,
    private readonly repo: GpsEfficiencyRepository,
    private readonly queue: GpsIngestQueue,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    this.start();
    this.systemConfig.onChange(() => this.restart());
  }

  onModuleDestroy(): void {
    this.stop();
  }

  private start(): void {
    if (!this.systemConfig.getGpsidPositionPull()) {
      return;
    }
    if (!this.gpsid.isConfigured) {
      this.logger.warn(
        'Position pull is on but GPS.id credentials are unset — position pull disabled.',
      );
      return;
    }
    const intervalMin = this.systemConfig.getGpsidPullIntervalMinutes();
    const handle = setInterval(() => void this.pullPositions(), intervalMin * 60_000);
    handle.unref();
    this.handle = handle;
    this.scheduler.addInterval(INTERVAL_NAME, handle);
    this.logger.log(`GPS.id position pull enabled — polling every ${intervalMin} min.`);
  }

  private stop(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
      if (this.scheduler.doesExist('interval', INTERVAL_NAME)) {
        this.scheduler.deleteInterval(INTERVAL_NAME);
      }
    }
  }

  private restart(): void {
    this.stop();
    this.start();
  }

  /** Pull each active device's recent history and enqueue it. Best-effort per device. */
  async pullPositions(): Promise<void> {
    if (!this.gpsid.isConfigured) {
      return;
    }
    const end = new Date();
    const lookbackMin = this.systemConfig.getGpsidPullIntervalMinutes() + OVERLAP_MIN;
    const startTime = new Date(end.getTime() - lookbackMin * 60_000);
    const startIso = startTime.toISOString();
    const endIso = end.toISOString();

    const devices = await this.repo.activeDeviceImeis();
    let enqueued = 0;
    for (const { imei } of devices) {
      try {
        const points = await this.gpsid.getHistory(imei, startIso, endIso);
        if (points.length > 0) {
          await this.queue.enqueue(points.map((p) => historyPointToPing(imei, p)));
          enqueued += points.length;
        }
      } catch (err) {
        this.logger.warn(`GPS.id position pull failed for ${imei}: ${String(err)}`);
      }
    }
    this.logger.log(
      `GPS.id position pull: enqueued ${enqueued} points from ${devices.length} device(s).`,
    );
  }
}
