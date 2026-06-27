import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { AppConfigService } from '../../config/config.service';

/**
 * Redis cache wrapper with graceful degradation: if Redis is unreachable, reads
 * return null and writes are silently skipped so the request path never fails
 * on cache errors. Operational reads are NOT cached (correctness first); this
 * backs reference data and aggregates (Phase 2).
 *
 * Key convention: `cache:<domain>:<scope>` e.g. `cache:reference:fuel:all`.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    this.client.on('error', (err) => {
      this.logger.warn(`Redis unavailable: ${err.message}`);
    });
    // Connect in the background; failures degrade gracefully.
    this.client.connect().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, payload);
      }
    } catch {
      // Degrade silently — cache writes are best-effort.
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }

  /**
   * Atomically increment a counter, (re)setting its TTL on first write. Returns
   * the new value, or 0 if Redis is unreachable (callers treat 0 as "no prior
   * activity" so a cache outage never blocks the request path).
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    try {
      const value = await this.client.incr(key);
      if (value === 1 && ttlSeconds > 0) {
        await this.client.expire(key, ttlSeconds);
      }
      return value;
    } catch {
      return 0;
    }
  }

  /**
   * Publish a message to a Redis pub/sub channel (Phase 7 GPS realtime fan-out:
   * `gps:positions`, `gps:alerts`). Best-effort: a Redis outage is logged and
   * swallowed so the ingest path never fails on a publish error. Returns the
   * subscriber count, or 0 when Redis is unreachable. (The subscriber side, in
   * Epic 7.4, uses a DEDICATED connection — a subscribed client can't publish.)
   */
  async publish(channel: string, message: unknown): Promise<number> {
    try {
      return await this.client.publish(channel, JSON.stringify(message));
    } catch {
      return 0;
    }
  }

  /** Delete every key matching a glob pattern (e.g. `cache:reference:*`). */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.client.del(...keys);
    } catch {
      return 0;
    }
  }

  /**
   * Delete the keys matching `pattern` for which `predicate(key)` is true. Lets
   * callers invalidate a precise subset (e.g. only the cache entries whose date
   * window covers a mutated day) instead of flushing a whole namespace.
   */
  async invalidateWhere(pattern: string, predicate: (key: string) => boolean): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      const matched = keys.filter(predicate);
      if (matched.length === 0) {
        return 0;
      }
      return await this.client.del(...matched);
    } catch {
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
