import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { type CacheService } from '../../modules/cache/cache.service';

import {
  CacheInvalidationInterceptor,
  MONITORING_CACHE_PREFIX,
  monitoringKeyCoversDate,
} from './cache-invalidation.interceptor';

function contextFor(method: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method }) }),
  } as unknown as ExecutionContext;
}

function handlerReturning(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('monitoringKeyCoversDate', () => {
  const key = (from: string, to: string, extra = ''): string =>
    `${MONITORING_CACHE_PREFIX}tonnage-5day:${from}:${to}${extra}`;

  it('matches a date inside the window (inclusive of both ends)', () => {
    expect(monitoringKeyCoversDate(key('2026-06-01', '2026-06-30'), '2026-06-15')).toBe(true);
    expect(monitoringKeyCoversDate(key('2026-06-01', '2026-06-30'), '2026-06-01')).toBe(true);
    expect(monitoringKeyCoversDate(key('2026-06-01', '2026-06-30'), '2026-06-30')).toBe(true);
  });

  it('rejects a date outside the window', () => {
    expect(monitoringKeyCoversDate(key('2026-06-01', '2026-06-30'), '2026-05-31')).toBe(false);
    expect(monitoringKeyCoversDate(key('2026-06-01', '2026-06-30'), '2026-07-01')).toBe(false);
  });

  it('reads the date tokens at a fixed position regardless of a trailing suffix', () => {
    expect(
      monitoringKeyCoversDate(key('2026-06-01', '2026-06-30', ':DONE:7:1:50'), '2026-06-10'),
    ).toBe(true);
  });

  it('returns false for a malformed key', () => {
    expect(monitoringKeyCoversDate('cache:monitoring:kpi-overview', '2026-06-10')).toBe(false);
    expect(monitoringKeyCoversDate('cache:monitoring:x:not-a-date:also-not', '2026-06-10')).toBe(
      false,
    );
  });
});

describe('CacheInvalidationInterceptor', () => {
  let cache: jest.Mocked<Pick<CacheService, 'invalidatePattern' | 'invalidateWhere'>>;
  let interceptor: CacheInvalidationInterceptor;

  beforeEach(() => {
    cache = {
      invalidatePattern: jest.fn().mockResolvedValue(1),
      invalidateWhere: jest.fn().mockResolvedValue(1),
    };
    interceptor = new CacheInvalidationInterceptor(cache as unknown as CacheService);
  });

  it('invalidates only the affected-date keys when the response carries an operationDate', async () => {
    const next = handlerReturning({ id: '1', operationDate: '2026-06-15' });
    await lastValueFrom(interceptor.intercept(contextFor('PUT'), next));

    expect(cache.invalidateWhere).toHaveBeenCalledTimes(1);
    const [pattern, predicate] = cache.invalidateWhere.mock.calls[0]!;
    expect(pattern).toBe(`${MONITORING_CACHE_PREFIX}*`);
    // The predicate keeps keys whose window covers the mutated day, drops others.
    expect(predicate(`${MONITORING_CACHE_PREFIX}tonnage-5day:2026-06-01:2026-06-30`)).toBe(true);
    expect(predicate(`${MONITORING_CACHE_PREFIX}tonnage-5day:2026-07-01:2026-07-31`)).toBe(false);
    expect(cache.invalidatePattern).not.toHaveBeenCalled();
  });

  it('falls back to a namespace flush when the response has no usable operationDate', async () => {
    const next = handlerReturning({ id: '1' });
    await lastValueFrom(interceptor.intercept(contextFor('PUT'), next));

    expect(cache.invalidatePattern).toHaveBeenCalledWith(`${MONITORING_CACHE_PREFIX}*`);
    expect(cache.invalidateWhere).not.toHaveBeenCalled();
  });

  it('does not invalidate on a read request', async () => {
    const next = handlerReturning({ operationDate: '2026-06-15' });
    await lastValueFrom(interceptor.intercept(contextFor('GET'), next));

    expect(cache.invalidatePattern).not.toHaveBeenCalled();
    expect(cache.invalidateWhere).not.toHaveBeenCalled();
  });

  it('passes the handler response through unchanged', async () => {
    const next = handlerReturning({ ok: true, operationDate: '2026-06-15' });
    const result = await lastValueFrom(interceptor.intercept(contextFor('PUT'), next));
    expect(result).toEqual({ ok: true, operationDate: '2026-06-15' });
  });
});
