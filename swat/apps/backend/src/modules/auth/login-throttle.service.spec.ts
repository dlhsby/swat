import { HttpException } from '@nestjs/common';

import { type CacheService } from '../cache/cache.service';

import { LoginThrottleService } from './login-throttle.service';

describe('LoginThrottleService', () => {
  let cache: { get: jest.Mock; increment: jest.Mock; del: jest.Mock };
  let service: LoginThrottleService;

  beforeEach(() => {
    cache = { get: jest.fn(), increment: jest.fn().mockResolvedValue(1), del: jest.fn() };
    service = new LoginThrottleService(cache as unknown as CacheService);
  });

  it('allows when both counters are below the limit', async () => {
    cache.get.mockResolvedValue(2);
    await expect(service.assertAllowed('1.1.1.1', 'admin')).resolves.toBeUndefined();
  });

  it('allows when counters are unset (null)', async () => {
    cache.get.mockResolvedValue(null);
    await expect(service.assertAllowed('1.1.1.1', 'admin')).resolves.toBeUndefined();
  });

  it('blocks with 429 when the IP counter reaches the limit', async () => {
    cache.get.mockImplementation((key: string) => (key.includes(':ip:') ? 5 : 0));
    await expect(service.assertAllowed('1.1.1.1', 'admin')).rejects.toBeInstanceOf(HttpException);
  });

  it('blocks with 429 when the username counter reaches the limit', async () => {
    cache.get.mockImplementation((key: string) => (key.includes(':user:') ? 6 : 0));
    await expect(service.assertAllowed('1.1.1.1', 'admin')).rejects.toBeInstanceOf(HttpException);
  });

  it('increments both counters on a failure with a 15-minute TTL', async () => {
    await service.registerFailure('1.1.1.1', 'Admin');
    expect(cache.increment).toHaveBeenCalledWith('login:fail:ip:1.1.1.1', 900);
    expect(cache.increment).toHaveBeenCalledWith('login:fail:user:admin', 900);
  });

  it('clears both counters on reset', async () => {
    await service.reset('1.1.1.1', 'Admin');
    expect(cache.del).toHaveBeenCalledWith('login:fail:ip:1.1.1.1');
    expect(cache.del).toHaveBeenCalledWith('login:fail:user:admin');
  });
});
