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

/**
 * Invalidates the monitoring dashboard cache after a successful **mutating**
 * request on the controller it is applied to (Phase 2, T-216). Bound to the trip
 * write routes (`PUT /trips/:id`, `PUT /trips/:id/verify`) so a recorded or
 * verified trip is reflected on the dashboards within the request, not after the
 * 15-minute TTL.
 *
 * Scope: only the `cache:monitoring:*` namespace is cleared — reference-data,
 * RBAC, and session caches are untouched. Read requests (GET) never invalidate.
 * Invalidation runs after the handler succeeds and never throws (CacheService
 * degrades gracefully), so it cannot fail the mutation.
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const method = context.switchToHttp().getRequest<{ method: string }>().method;
    return next.handle().pipe(
      tap(() => {
        if (method !== 'GET') {
          void this.cache.invalidatePattern(`${MONITORING_CACHE_PREFIX}*`);
        }
      }),
    );
  }
}
