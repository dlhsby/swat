import { type AppConfigService } from '../../config/config.service';

import { CacheService } from './cache.service';

const client = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => client),
}));

function build(): CacheService {
  return new CacheService({ redisUrl: 'redis://localhost:6379' } as unknown as AppConfigService);
}

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = build();
  });

  describe('get', () => {
    it('parses a stored JSON value', async () => {
      client.get.mockResolvedValue(JSON.stringify({ a: 1 }));
      await expect(service.get('k')).resolves.toEqual({ a: 1 });
    });

    it('returns null on a miss', async () => {
      client.get.mockResolvedValue(null);
      await expect(service.get('k')).resolves.toBeNull();
    });

    it('degrades to null when Redis throws', async () => {
      client.get.mockRejectedValue(new Error('down'));
      await expect(service.get('k')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('writes with a TTL when given', async () => {
      await service.set('k', { a: 1 }, 60);
      expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }), 'EX', 60);
    });

    it('writes without a TTL otherwise', async () => {
      await service.set('k', { a: 1 });
      expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }));
    });

    it('swallows write errors', async () => {
      client.set.mockRejectedValue(new Error('down'));
      await expect(service.set('k', 1)).resolves.toBeUndefined();
    });
  });

  it('del ignores errors', async () => {
    client.del.mockRejectedValue(new Error('down'));
    await expect(service.del('k')).resolves.toBeUndefined();
  });

  describe('increment', () => {
    it('sets a TTL on the first increment only', async () => {
      client.incr.mockResolvedValue(1);
      await expect(service.increment('k', 900)).resolves.toBe(1);
      expect(client.expire).toHaveBeenCalledWith('k', 900);
    });

    it('does not reset the TTL on later increments', async () => {
      client.incr.mockResolvedValue(2);
      await expect(service.increment('k', 900)).resolves.toBe(2);
      expect(client.expire).not.toHaveBeenCalled();
    });

    it('returns 0 when Redis is unreachable', async () => {
      client.incr.mockRejectedValue(new Error('down'));
      await expect(service.increment('k', 900)).resolves.toBe(0);
    });
  });

  describe('invalidatePattern', () => {
    it('returns 0 when no keys match', async () => {
      client.keys.mockResolvedValue([]);
      await expect(service.invalidatePattern('cache:*')).resolves.toBe(0);
      expect(client.del).not.toHaveBeenCalled();
    });

    it('deletes all matching keys', async () => {
      client.keys.mockResolvedValue(['a', 'b']);
      client.del.mockResolvedValue(2);
      await expect(service.invalidatePattern('cache:*')).resolves.toBe(2);
      expect(client.del).toHaveBeenCalledWith('a', 'b');
    });

    it('returns 0 on error', async () => {
      client.keys.mockRejectedValue(new Error('down'));
      await expect(service.invalidatePattern('cache:*')).resolves.toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('quits cleanly', async () => {
      client.quit.mockResolvedValue('OK');
      await service.onModuleDestroy();
      expect(client.quit).toHaveBeenCalled();
    });

    it('falls back to disconnect when quit fails', async () => {
      client.quit.mockRejectedValue(new Error('boom'));
      await service.onModuleDestroy();
      expect(client.disconnect).toHaveBeenCalled();
    });
  });
});
