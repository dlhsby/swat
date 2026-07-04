import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { SystemConfigService } from '../../../config';

import { GpsVehicleSyncService } from './gps-vehicle-sync.service';
import { GpsidClientService } from './gpsid-client.service';

const INTERVAL_NAME = 'gpsid-vehicle-sync';

/**
 * Scheduled GPS.id vehicle-roster sync (Phase 7 / B4). When `gpsid.vehicleSync` is on
 * and the pull credentials are set, reconciles the vendor roster with the device
 * registry every `gpsid.vehicleSyncIntervalMin` minutes. Settings are read from
 * {@link SystemConfigService} (DB → env → default), and the interval **re-registers
 * on the fly** whenever those settings change — no restart needed.
 */
@Injectable()
export class GpsVehicleSyncJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GpsVehicleSyncJob.name);
  private handle: NodeJS.Timeout | null = null;

  constructor(
    private readonly systemConfig: SystemConfigService,
    private readonly gpsid: GpsidClientService,
    private readonly syncService: GpsVehicleSyncService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    this.start();
    // Re-apply the schedule when the admin toggles/retimes it in Settings.
    this.systemConfig.onChange(() => this.restart());
  }

  onModuleDestroy(): void {
    this.stop();
  }

  private start(): void {
    if (!this.systemConfig.getGpsidVehicleSync()) {
      return;
    }
    if (!this.gpsid.isConfigured) {
      this.logger.warn(
        'Vehicle sync is on but GPS.id credentials are unset — vehicle sync disabled.',
      );
      return;
    }
    const intervalMin = this.systemConfig.getGpsidVehicleSyncIntervalMinutes();
    const handle = setInterval(() => void this.runSync(), intervalMin * 60_000);
    handle.unref();
    this.handle = handle;
    this.scheduler.addInterval(INTERVAL_NAME, handle);
    this.logger.log(`GPS.id vehicle sync enabled — running every ${intervalMin} min.`);
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

  /** Tear down + re-init (idempotent) so the new enabled/interval takes effect. */
  private restart(): void {
    this.stop();
    this.start();
  }

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
