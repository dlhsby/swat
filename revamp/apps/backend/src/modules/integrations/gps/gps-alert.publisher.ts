import { Injectable } from '@nestjs/common';

import { CacheService } from '../../cache/cache.service';

import { GPS_ALERTS_CHANNEL } from './gps.types';

/** A deviation alert event broadcast to the realtime alert center (Epic 7.4). */
export interface AlertEvent {
  readonly id: string;
  readonly vehicleId: string;
  readonly tripId: string | null;
  readonly alertType: string;
  readonly severity: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceM: number | null;
  readonly createdAt: string;
}

/**
 * Publishes confirmed deviation alerts to the `gps:alerts` Redis channel (Phase 7).
 * The realtime gateway (Epic 7.4) bridges this to the alert-center clients.
 * Best-effort — a Redis outage never blocks the matcher.
 */
@Injectable()
export class GpsAlertPublisher {
  constructor(private readonly cache: CacheService) {}

  async publish(event: AlertEvent): Promise<void> {
    await this.cache.publish(GPS_ALERTS_CHANNEL, event);
  }
}
