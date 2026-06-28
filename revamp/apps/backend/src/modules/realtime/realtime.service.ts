import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { type Observable, Subject } from 'rxjs';

import { AppConfigService } from '../../config/config.service';
import { GPS_ALERTS_CHANNEL, GPS_POSITIONS_CHANNEL } from '../integrations/gps/gps.types';

export interface RealtimeEvent {
  readonly channel: string;
  readonly payload: { vehicleId?: string } & Record<string, unknown>;
}

/**
 * Bridges the GPS Redis pub/sub channels (`gps:positions`, `gps:alerts`) into an
 * in-process RxJS stream the SSE gateway fans out to clients (Phase 7, T-715).
 * Uses a DEDICATED ioredis connection — a subscribed client can't run other
 * commands. ioredis auto-reconnects AND re-subscribes, so the stream survives a
 * Redis blip; a malformed message is dropped, never crashing the stream.
 */
@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly events$ = new Subject<RealtimeEvent>();
  private subscriber: Redis | null = null;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    const client = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    client.on('error', (err) => this.logger.warn(`Realtime Redis unavailable: ${err.message}`));
    client.on('message', (channel: string, message: string) => {
      try {
        this.events$.next({ channel, payload: JSON.parse(message) as RealtimeEvent['payload'] });
      } catch {
        // Drop a malformed message — never break the stream.
      }
    });
    void client.subscribe(GPS_POSITIONS_CHANNEL, GPS_ALERTS_CHANNEL).catch((err: Error) => {
      this.logger.warn(`Realtime subscribe failed: ${err.message}`);
    });
    this.subscriber = client;
  }

  /** The live event stream (positions + alerts). */
  stream(): Observable<RealtimeEvent> {
    return this.events$.asObservable();
  }

  async onModuleDestroy(): Promise<void> {
    this.events$.complete();
    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch {
        this.subscriber.disconnect();
      }
    }
  }
}
