import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';

import { CacheService } from '../../modules/cache/cache.service';

/** Namespace of every monitoring dashboard cache key (see MonitoringService). */
export const MONITORING_CACHE_PREFIX = 'cache:monitoring:';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when a monitoring cache key's `[dateFrom, dateTo]` window covers `date`.
 * Keys are built as `cache:monitoring:<endpoint>:<dateFrom>:<dateTo>[:extra]`
 * (see {@link MonitoringService}); the two date tokens sit at fixed positions and
 * `YYYY-MM-DD` strings compare correctly lexically, so no Date parsing is needed.
 */
export function monitoringKeyCoversDate(key: string, date: string): boolean {
  const parts = key.split(':');
  const dateFrom = parts[3];
  const dateTo = parts[4];
  if (dateFrom === undefined || dateTo === undefined) {
    return false;
  }
  if (!ISO_DATE.test(dateFrom) || !ISO_DATE.test(dateTo)) {
    return false;
  }
  return dateFrom <= date && date <= dateTo;
}

/** Pull a `YYYY-MM-DD` `operationDate` off the handler's response, if present. */
function operationDateOf(data: unknown): string | null {
  if (data !== null && typeof data === 'object' && 'operationDate' in data) {
    const value = (data as { operationDate: unknown }).operationDate;
    if (typeof value === 'string' && ISO_DATE.test(value)) {
      return value;
    }
  }
  return null;
}

/**
 * Invalidates the monitoring dashboard cache after a successful **mutating**
 * request on the controller it is applied to (Phase 2, T-216). Bound to the trip
 * write routes (`PUT /trips/:id`, `PUT /trips/:id/verify`) so a recorded or
 * verified trip is reflected on the dashboards within the request, not after the
 * 15-minute TTL.
 *
 * Scope: only the `cache:monitoring:*` namespace is cleared — reference-data,
 * RBAC, and session caches are untouched. When the mutation response carries an
 * `operationDate`, only the cache entries whose date window covers that day are
 * dropped (T-216 "affected-date keys only"); if the date can't be determined the
 * whole monitoring namespace is flushed as a safe fallback. Read requests (GET)
 * never invalidate. Invalidation runs after the handler succeeds and never throws
 * (CacheService degrades gracefully), so it cannot fail the mutation.
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const method = context.switchToHttp().getRequest<{ method: string }>().method;
    return next.handle().pipe(
      tap((data) => {
        if (method === 'GET') {
          return;
        }
        const date = operationDateOf(data);
        if (date === null) {
          void this.cache.invalidatePattern(`${MONITORING_CACHE_PREFIX}*`);
          return;
        }
        void this.cache.invalidateWhere(`${MONITORING_CACHE_PREFIX}*`, (key) =>
          monitoringKeyCoversDate(key, date),
        );
      }),
    );
  }
}
