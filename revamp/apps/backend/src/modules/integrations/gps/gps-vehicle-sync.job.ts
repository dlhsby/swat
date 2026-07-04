import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AppConfigService } from '../../../config';

import { GpsVehicleSyncService } from './gps-vehicle-sync.service';
import { GpsidClientService } from './gpsid-client.service';

const INTERVAL_NAME = 'gpsid-vehicle-sync';

/**
 * Scheduled GPS.id vehicle-roster sync (Phase 7 / B4). When `GPSID_VEHICLE_SYNC=true`
 * and the pull credentials are set, reconciles the vendor's `/vehicle` roster with
 * the SWAT device registry by plate every `GPSID_VEHICLE_SYNC_INTERVAL_MIN` minutes.
 * The same reconciliation the devices page triggers on demand. No-ops cleanly when
 * disabled or unconfigured; a failed run logs and waits for the next tick.
 */
@Injectable()
export class GpsVehicleSyncJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GpsVehicleSyncJob.name);
  private handle: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly gpsid: GpsidClientService,
    private readonly syncService: GpsVehicleSyncService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.config.gpsidVehicleSync) {
      return;
    }
    if (!this.gpsid.isConfigured) {
      this.logger.warn(
        'GPSID_VEHICLE_SYNC is on but GPS.id credentials are unset — vehicle sync disabled.',
      );
      return;
    }
    const intervalMin = this.config.gpsidVehicleSyncIntervalMinutes;
    const handle = setInterval(() => {
      void this.runSync();
    }, intervalMin * 60_000);
    handle.unref();
    this.handle = handle;
    this.scheduler.addInterval(INTERVAL_NAME, handle);
    this.logger.log(`GPS.id vehicle sync enabled — running every ${intervalMin} min.`);
  }

  onModuleDestroy(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
      if (this.scheduler.doesExist('interval', INTERVAL_NAME)) {
        this.scheduler.deleteInterval(INTERVAL_NAME);
      }
    }
  }

  /** Best-effort scheduled reconciliation — errors log and wait for the next tick. */
  async runSync(): Promise<void> {
    if (!this.gpsid.isConfigured) {
      return;
    }
    try {
      await this.syncService.sync();
    } catch (err) {
      this.logger.warn(`GPS.id vehicle sync failed: ${String(err)}`);
    }
  }
}
