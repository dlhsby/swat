import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config';
import { CacheService } from '../cache/cache.service';

import { type ApiPrincipal } from './types/principal';

/** Outcome of a rate-limit check for one principal in the current 60s window. */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  /** Seconds until the window resets — set as `Retry-After` on a 429. */
  readonly retryAfter: number;
}

const WINDOW_SECONDS = 60;

/**
 * Fixed-window per-principal rate limiter for the weighbridge API (Phase 4,
 * T-411). Keyed by principal so a USER and a ServiceAccount get independent
 * budgets. A ServiceAccount uses its own `rateLimitPerMin`; a USER falls back to
 * the configured default. Backed by Redis via {@link CacheService.increment}
 * (atomic INCR + first-write TTL). If Redis is down, `increment` returns a low
 * count and the request is allowed — availability over strict enforcement, since
 * the weighbridge is on the TPA critical path.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly config: AppConfigService,
  ) {}

  async check(principal: ApiPrincipal): Promise<RateLimitResult> {
    const limit = principal.rateLimitPerMin ?? this.config.weighbridgeRateLimitPerMin;
    const key = `wb:rl:${principal.type}:${principal.id}`;
    const count = await this.cache.increment(key, WINDOW_SECONDS);
    // `increment` returns 0 ONLY when Redis is unreachable (a real INCR is ≥1).
    // This is a deliberate fail-OPEN: the weighbridge is on the TPA critical path,
    // so a cache outage must not block weighings. Surface it loudly so the outage
    // (and the temporarily-unenforced limit) is observable rather than silent.
    if (count === 0) {
      this.logger.warn(
        `Rate limit not enforced for ${principal.type}:${principal.id} — cache unavailable (fail-open)`,
      );
      return { allowed: true, limit, remaining: limit, retryAfter: WINDOW_SECONDS };
    }
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfter: WINDOW_SECONDS,
    };
  }
}
