import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { SystemConfigService } from '../../../config';

import { GasificationClientService } from './gasification-client.service';
import { GasificationSyncService } from './gasification-sync.service';

const INTERVAL_NAME = 'gasification-pull';

/**
 * Scheduled PTSI gasification pull. When `gasification.enabled` is on and an API key
 * is configured, re-scans the recent WIB days every `gasification.pullIntervalMin`
 * minutes and matches records to disposal trips. Mirrors the GPS.id pull job: the
 * interval re-registers on the fly when settings change, and no-ops cleanly when
 * disabled or unconfigured.
 */
@Injectable()
export class GasificationPullJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GasificationPullJob.name);
  private handle: NodeJS.Timeout | null = null;

  constructor(
    private readonly systemConfig: SystemConfigService,
    private readonly client: GasificationClientService,
    private readonly sync: GasificationSyncService,
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
    if (!this.systemConfig.getGasificationEnabled()) {
      return;
    }
    if (!this.client.isConfigured) {
      this.logger.warn('Gasification sync is on but the API key is unset — sync disabled.');
      return;
    }
    const intervalMin = this.systemConfig.getGasificationPullIntervalMinutes();
    const handle = setInterval(() => void this.tick(), intervalMin * 60_000);
    handle.unref();
    this.handle = handle;
    this.scheduler.addInterval(INTERVAL_NAME, handle);
    this.logger.log(`Gasification sync enabled — polling every ${intervalMin} min.`);
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

  private async tick(): Promise<void> {
    try {
      const results = await this.sync.syncRecentDays();
      const matched = results.reduce((sum, r) => sum + r.matched, 0);
      const upserted = results.reduce((sum, r) => sum + r.upserted, 0);
      if (upserted > 0 || matched > 0) {
        this.logger.log(
          `Gasification sync: ${upserted} record(s) across ${results.length} day(s), ${matched} newly matched.`,
        );
      }
    } catch (err) {
      this.logger.warn(`Gasification scheduled sync failed: ${String(err)}`);
    }
  }
}
