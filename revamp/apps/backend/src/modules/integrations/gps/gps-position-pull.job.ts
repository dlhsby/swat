import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { SystemConfigService } from '../../../config';

import { GpsEfficiencyRepository } from './gps-efficiency.repository';
import { GpsIngestQueue } from './gps-ingest.queue';
import { type CanonicalPing } from './gps.types';
import { type GpsidHistoryPoint, GpsidClientService } from './gpsid-client.service';

const INTERVAL_NAME = 'gpsid-position-pull';
/** Extra minutes pulled beyond the interval so a slow tick never leaves a gap. */
const OVERLAP_MIN = 5;
/** Lookback for an on-demand "pull now" — wide enough to surface a quiet device's
 * last known point, but bounded so the vendor call stays cheap. */
const ON_DEMAND_LOOKBACK_MIN = 24 * 60;

/** Result of an on-demand pull for one device. */
export interface DevicePullResult {
  readonly enqueued: number;
  readonly latest: CanonicalPing | null;
}

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
    // setInterval only fires AFTER the first interval — pull once now so enabling the
    // job (or a boot with it on) yields positions immediately instead of a day later.
    void this.pullPositions();
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

  /**
   * On-demand pull for ONE device (the "Tarik Posisi" / pull-now button). Fetches a
   * wide recent window so even a quiet device surfaces its last known point, feeds it
   * through the SAME ingest pipeline (so the map/last-seen update), and returns the
   * most recent point for immediate display. Independent of the scheduled-pull toggle;
   * needs only GPS.id credentials.
   */
  async pullDeviceNow(imei: string): Promise<DevicePullResult> {
    if (!this.gpsid.isConfigured) {
      throw new BadRequestException('Integrasi GPS.id belum dikonfigurasi (kredensial kosong).');
    }
    const end = new Date();
    const start = new Date(end.getTime() - ON_DEMAND_LOOKBACK_MIN * 60_000);
    const points = await this.gpsid.getHistory(imei, start.toISOString(), end.toISOString());
    const pings = points.map((p) => historyPointToPing(imei, p));
    if (pings.length > 0) {
      await this.queue.enqueue(pings);
    }
    const latest = pings.reduce<CanonicalPing | null>(
      (acc, p) => (!acc || p.recordedAt > acc.recordedAt ? p : acc),
      null,
    );
    this.logger.log(`GPS.id pull-now for ${imei}: ${pings.length} point(s).`);
    return { enqueued: pings.length, latest };
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
