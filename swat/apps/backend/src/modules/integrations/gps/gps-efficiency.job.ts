import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GpsEfficiencyRepository } from './gps-efficiency.repository';
import { GpsEfficiencyService } from './gps-efficiency.service';
import { GpsidClientService } from './gpsid-client.service';

const MAX_IMEIS_PER_CALL = 5;

/**
 * Nightly efficiency jobs (Phase 7, T-719/720). At 02:30 recompute the previous
 * day's efficiency rows (heal), then — if the GPS.id pull is configured —
 * cross-check fuel against the vendor's reported mileage. The reconcile no-ops
 * cleanly when GPS.id isn't configured (dev/CI), so the cron is always safe.
 */
@Injectable()
export class GpsEfficiencyJob {
  private readonly logger = new Logger(GpsEfficiencyJob.name);

  constructor(
    private readonly efficiency: GpsEfficiencyService,
    private readonly repo: GpsEfficiencyRepository,
    private readonly gpsid: GpsidClientService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async nightly(): Promise<void> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.efficiency.refreshForDate(yesterday);
    await this.reconcileFuel(yesterday);
  }

  /**
   * Pull GPS.id `report/mileage` per device for the date and store `used_fuel` as
   * the cross-check. Batched to the vendor's ≤5-IMEI limit; rate-limited by the
   * client. Best-effort — a vendor error logs and moves on.
   */
  async reconcileFuel(date: Date): Promise<void> {
    if (!this.gpsid.isConfigured) {
      return;
    }
    const dateIso = date.toISOString().slice(0, 10);
    const devices = await this.repo.activeDeviceImeis();
    const vehicleByImei = new Map(devices.map((d) => [d.imei, d.vehicleId]));

    for (let i = 0; i < devices.length; i += MAX_IMEIS_PER_CALL) {
      const batch = devices.slice(i, i + MAX_IMEIS_PER_CALL).map((d) => d.imei);
      try {
        const mileage = await this.gpsid.getMileage(batch, dateIso);
        for (const m of mileage) {
          const vehicleId = vehicleByImei.get(m.imei);
          if (vehicleId) {
            await this.repo.updateGpsidFuel(date, vehicleId, m.usedFuelLiters);
          }
        }
      } catch (err) {
        this.logger.warn(`GPS.id mileage reconcile batch failed: ${String(err)}`);
      }
    }
  }
}
