import { Injectable } from '@nestjs/common';

import { CacheService } from '../../cache/cache.service';

import { GPS_POSITIONS_CHANNEL } from './gps.types';

/** A live position event broadcast to the realtime gateway (Epic 7.4). */
export interface LivePositionEvent {
  readonly type: 'position';
  readonly vehicleId: string;
  readonly imei: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly heading: number | null;
  readonly engineOn: boolean;
  readonly recordedAt: string;
  readonly source: string;
}

/** A device online/offline transition broadcast to the realtime gateway. */
export interface DeviceStatusEvent {
  readonly type: 'status';
  readonly vehicleId: string;
  readonly status: 'online' | 'offline';
}

/**
 * Publishes GPS position + device-status events to the `gps:positions` Redis
 * channel (Phase 7). The realtime gateway (Epic 7.4) subscribes on a dedicated
 * connection and fans them out to map clients. Publishing is best-effort —
 * {@link CacheService.publish} swallows a Redis outage so ingestion never fails.
 */
@Injectable()
export class GpsPositionPublisher {
  constructor(private readonly cache: CacheService) {}

  async publishPosition(event: Omit<LivePositionEvent, 'type'>): Promise<void> {
    await this.cache.publish(GPS_POSITIONS_CHANNEL, { type: 'position', ...event });
  }

  async publishStatus(event: Omit<DeviceStatusEvent, 'type'>): Promise<void> {
    await this.cache.publish(GPS_POSITIONS_CHANNEL, { type: 'status', ...event });
  }
}
