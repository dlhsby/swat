import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { type CacheService } from '../../modules/cache/cache.service';

import {
  CacheInvalidationInterceptor,
  MONITORING_CACHE_PREFIX,
} from './cache-invalidation.interceptor';

function contextFor(method: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method }) }),
  } as unknown as ExecutionContext;
}

describe('CacheInvalidationInterceptor', () => {
  let cache: jest.Mocked<Pick<CacheService, 'invalidatePattern'>>;
  let interceptor: CacheInvalidationInterceptor;
  const next: CallHandler = { handle: () => of({ ok: true }) };

  beforeEach(() => {
    cache = { invalidatePattern: jest.fn().mockResolvedValue(1) };
    interceptor = new CacheInvalidationInterceptor(cache as unknown as CacheService);
  });

  it('invalidates only the monitoring namespace after a mutating request', async () => {
    await lastValueFrom(interceptor.intercept(contextFor('PUT'), next));
    expect(cache.invalidatePattern).toHaveBeenCalledWith(`${MONITORING_CACHE_PREFIX}*`);
    expect(cache.invalidatePattern).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate on a read request', async () => {
    await lastValueFrom(interceptor.intercept(contextFor('GET'), next));
    expect(cache.invalidatePattern).not.toHaveBeenCalled();
  });

  it('passes the handler response through unchanged', async () => {
    const result = await lastValueFrom(interceptor.intercept(contextFor('PUT'), next));
    expect(result).toEqual({ ok: true });
  });
});
