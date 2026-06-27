import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type Queue } from 'bullmq';

import {
  type CanonicalPing,
  type GpsIngestJobData,
  GPS_INGEST_JOB,
  GPS_INGEST_QUEUE,
} from './gps.types';

/**
 * GPS ingest producer (Phase 7). The webhook responds fast and offloads the
 * persist + matcher work to the BullMQ worker. A batch of normalized pings from
 * one webhook call becomes one job; retries with backoff so a transient DB/Redis
 * blip never drops pings (failed jobs are kept for inspection).
 */
@Injectable()
export class GpsIngestQueue {
  constructor(@InjectQueue(GPS_INGEST_QUEUE) private readonly queue: Queue<GpsIngestJobData>) {}

  async enqueue(pings: readonly CanonicalPing[]): Promise<void> {
    if (pings.length === 0) {
      return;
    }
    await this.queue.add(
      GPS_INGEST_JOB,
      { pings: [...pings] },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );
  }
}
