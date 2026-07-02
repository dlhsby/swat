import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AppConfigService } from '../../../config';

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
 * Near-real-time GPS.id **position pull** (Phase 7 / Phase B). When
 * `GPSID_POSITION_PULL=true` and the pull credentials are set, poll
 * `report/history` per active device every `GPSID_PULL_INTERVAL_MIN` minutes and
 * feed the positions through the SAME ingest queue as the push webhook (so
 * matching + deviation + activity all run identically). Duplicate points across
 * overlapping windows are dropped by the ping repo's `skipDuplicates`.
 *
 * A secondary path to the push webhook: use it when the vendor push isn't wired,
 * or to backfill gaps. No-ops cleanly when disabled or unconfigured.
 */
@Injectable()
export class GpsPositionPullJob implements OnModuleInit {
  private readonly logger = new Logger(GpsPositionPullJob.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly gpsid: GpsidClientService,
    private readonly repo: GpsEfficiencyRepository,
    private readonly queue: GpsIngestQueue,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.config.gpsidPositionPull) {
      return;
    }
    if (!this.gpsid.isConfigured) {
      this.logger.warn(
        'GPSID_POSITION_PULL is on but GPS.id credentials are unset — position pull disabled.',
      );
      return;
    }
    const intervalMin = this.config.gpsidPullIntervalMinutes;
    const handle = setInterval(() => {
      void this.pullPositions();
    }, intervalMin * 60_000);
    // Don't let the poll timer keep the process alive on its own.
    handle.unref();
    this.scheduler.addInterval(INTERVAL_NAME, handle);
    this.logger.log(`GPS.id position pull enabled — polling every ${intervalMin} min.`);
  }

  /**
   * Pull each active device's recent history and enqueue it. Best-effort per
   * device — a vendor error for one IMEI logs and moves on. The lookback window is
   * the poll interval plus a small overlap so a delayed tick never drops points.
   */
  async pullPositions(): Promise<void> {
    if (!this.gpsid.isConfigured) {
      return;
    }
    const end = new Date();
    const lookbackMin = this.config.gpsidPullIntervalMinutes + OVERLAP_MIN;
    const start = new Date(end.getTime() - lookbackMin * 60_000);
    const startIso = start.toISOString();
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
