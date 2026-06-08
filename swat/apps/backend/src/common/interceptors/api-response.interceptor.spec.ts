import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { ApiResponseInterceptor } from './api-response.interceptor';

function runInterceptor<T>(payload: T) {
  const interceptor = new ApiResponseInterceptor<T>();
  const ctx = {} as ExecutionContext;
  const next: CallHandler<T> = { handle: () => of(payload) };
  return lastValueFrom(interceptor.intercept(ctx, next));
}

describe('ApiResponseInterceptor', () => {
  it('wraps a bare value in the success envelope', async () => {
    const result = await runInterceptor({ id: 1 });
    expect(result).toEqual({ success: true, data: { id: 1 }, error: null, meta: null });
  });

  it('surfaces pagination meta when present', async () => {
    const meta = { total: 100, page: 1, limit: 20 };
    const result = await runInterceptor({ data: [1, 2, 3], meta });
    expect(result).toEqual({ success: true, data: [1, 2, 3], error: null, meta });
  });

  it('treats a plain object without meta as data', async () => {
    const result = await runInterceptor({ data: 'only-data-key' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ data: 'only-data-key' });
    expect(result.meta).toBeNull();
  });
});
