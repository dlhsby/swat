import { Injectable } from '@nestjs/common';

import { CacheService } from '../../cache/cache.service';

const TTL_SECONDS = 24 * 60 * 60; // 24h per spec §1.2

/**
 * Idempotency for the post/patch weighing endpoints (Phase 4, T-410). Keyed by
 * the client's `Idempotency-Key` header; a cached response is replayed for 24h so
 * a retried POST (e.g. an offline-queue flush) never creates a duplicate Trip or
 * TpaInboundLog. Redis-backed via {@link CacheService}; if Redis is down, lookups
 * miss and the request simply processes normally (no duplicate suppression).
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly cache: CacheService) {}

  get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(this.cacheKey(key));
  }

  async store(key: string, response: unknown): Promise<void> {
    await this.cache.set(this.cacheKey(key), response, TTL_SECONDS);
  }

  private cacheKey(key: string): string {
    return `wb:idem:${key}`;
  }
}
