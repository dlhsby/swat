import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  ServiceUnavailableException,
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

/** Result of an on-demand "pull all registered devices" run. */
export interface PullAllResult {
  readonly totalDevices: number;
  readonly pulled: number;
  readonly enqueued: number;
  readonly rateLimited: number;
}

/** True for the vendor's own rate-limit guard (thrown before any network call) — distinct
 * from other GPS.id failures (bad login, history endpoint error) so callers can report
 * "hit the rate limit" separately from "this device failed". */
function isRateLimited(err: unknown): boolean {
  return err instanceof ServiceUnavailableException && err.message.includes('rate limit');
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
    // NB: intentionally NO immediate pull here. The vendor guard is a tight
    // 5-calls / 5-min budget shared by all GPS.id calls; bursting every device on
    // each boot would exhaust it and 503 the on-demand "Tarik Posisi" pulls. The
    // scheduled tick covers the periodic pull; the per-device button covers on-demand.
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

  /**
   * Pull each active device's recent history and enqueue it. Best-effort per device —
   * a device hitting the vendor's 5-calls/5-min rate limit is counted separately
   * (`rateLimited`) from other per-device failures, since the guard throws before any
   * network call (fast/cheap even when most of a large fleet gets rate-limited in one
   * run). Used by both the scheduled tick and the on-demand "Tarik Semua Posisi" button.
   */
  async pullPositions(): Promise<PullAllResult> {
    if (!this.gpsid.isConfigured) {
      return { totalDevices: 0, pulled: 0, enqueued: 0, rateLimited: 0 };
    }
    const end = new Date();
    const lookbackMin = this.systemConfig.getGpsidPullIntervalMinutes() + OVERLAP_MIN;
    const startTime = new Date(end.getTime() - lookbackMin * 60_000);
    const startIso = startTime.toISOString();
    const endIso = end.toISOString();

    const devices = await this.repo.activeDeviceImeis();
    let enqueued = 0;
    let pulled = 0;
    let rateLimited = 0;
    for (const { imei } of devices) {
      try {
        const points = await this.gpsid.getHistory(imei, startIso, endIso);
        if (points.length > 0) {
          await this.queue.enqueue(points.map((p) => historyPointToPing(imei, p)));
          enqueued += points.length;
        }
        pulled += 1;
      } catch (err) {
        if (isRateLimited(err)) {
          rateLimited += 1;
        } else {
          this.logger.warn(`GPS.id position pull failed for ${imei}: ${String(err)}`);
        }
      }
    }
    this.logger.log(
      `GPS.id position pull: enqueued ${enqueued} points from ${pulled}/${devices.length} device(s)` +
        (rateLimited > 0 ? ` (${rateLimited} rate-limited)` : '') +
        '.',
    );
    return { totalDevices: devices.length, pulled, enqueued, rateLimited };
  }
}
