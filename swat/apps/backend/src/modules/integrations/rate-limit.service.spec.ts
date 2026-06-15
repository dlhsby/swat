import { type AppConfigService } from '../../config';
import { type CacheService } from '../cache/cache.service';

import { RateLimitService } from './rate-limit.service';
import { type ApiPrincipal } from './types/principal';

const USER: ApiPrincipal = { type: 'USER', id: 'u1', name: 'operator', roleId: 'r1' };
const SA: ApiPrincipal = {
  type: 'SERVICE_ACCOUNT',
  id: 's1',
  name: 'tpa',
  roleId: 'r2',
  rateLimitPerMin: 2,
};

describe('RateLimitService', () => {
  let cache: { increment: jest.Mock };
  let config: { weighbridgeRateLimitPerMin: number };
  let service: RateLimitService;

  beforeEach(() => {
    cache = { increment: jest.fn() };
    config = { weighbridgeRateLimitPerMin: 3 };
    service = new RateLimitService(
      cache as unknown as CacheService,
      config as unknown as AppConfigService,
    );
  });

  it('allows a user within the configured default limit', async () => {
    cache.increment.mockResolvedValue(3);
    const result = await service.check(USER);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(0);
    expect(cache.increment).toHaveBeenCalledWith('wb:rl:USER:u1', 60);
  });

  it('blocks a user once over the default limit', async () => {
    cache.increment.mockResolvedValue(4);
    const result = await service.check(USER);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60);
  });

  it('uses the per-account limit for a service account', async () => {
    cache.increment.mockResolvedValue(3);
    const result = await service.check(SA);
    expect(result.limit).toBe(2);
    expect(result.allowed).toBe(false);
    expect(cache.increment).toHaveBeenCalledWith('wb:rl:SERVICE_ACCOUNT:s1', 60);
  });
});
