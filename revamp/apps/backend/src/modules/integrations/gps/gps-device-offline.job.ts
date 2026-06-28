import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AppConfigService } from '../../../config/config.service';

import { GpsPingRepository } from './gps-ping.repository';
import { GpsPositionPublisher } from './gps-position.publisher';

/**
 * Device-offline sweep (Phase 7, T-706). Once a minute, flips any online device
 * whose last ping is older than `GPS_DEVICE_OFFLINE_MINUTES` to offline and
 * publishes the status change so the live map dims it. Idempotent — a device
 * already offline (or freshly pinged) is untouched.
 */
@Injectable()
export class GpsDeviceOfflineJob {
  private readonly logger = new Logger(GpsDeviceOfflineJob.name);

  constructor(
    private readonly repo: GpsPingRepository,
    private readonly publisher: GpsPositionPublisher,
    private readonly config: AppConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.gps.deviceOfflineMinutes * 60_000);
    const flipped = await this.repo.markStaleDevicesOffline(cutoff);
    for (const device of flipped) {
      await this.publisher.publishStatus({ vehicleId: device.vehicleId, status: 'offline' });
    }
    if (flipped.length > 0) {
      this.logger.log(`Device-offline sweep: ${flipped.length} device(s) flipped to offline.`);
    }
  }
}
