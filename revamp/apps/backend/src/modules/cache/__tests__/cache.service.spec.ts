import { type AppConfigService } from '../../../config/config.service';
import { CacheService } from '../cache.service';

// In-memory mock of the ioredis client.
const store = new Map<string, string>();
const mock = {
  get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
  set: jest.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((...keys: string[]) => {
    let n = 0;
    for (const k of keys) {
      if (store.delete(k)) n += 1;
    }
    return Promise.resolve(n);
  }),
  keys: jest.fn((pattern: string) => {
    const prefix = pattern.replace(/\*$/, '');
    return Promise.resolve([...store.keys()].filter((k) => k.startsWith(prefix)));
  }),
  on: jest.fn(),
  connect: jest.fn(() => Promise.resolve()),
  quit: jest.fn(() => Promise.resolve('OK')),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mock),
}));

function makeConfig(): AppConfigService {
  return { redisUrl: 'redis://localhost:6379' } as AppConfigService;
}

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
    service = new CacheService(makeConfig());
  });

  it('round-trips a JSON value', async () => {
    await service.set('cache:reference:fuel:all', [{ id: 1 }]);
    expect(await service.get<{ id: number }[]>('cache:reference:fuel:all')).toEqual([{ id: 1 }]);
  });

  it('returns null for a missing key', async () => {
    expect(await service.get('cache:missing')).toBeNull();
  });

  it('sets a TTL when provided', async () => {
    await service.set('k', 'v', 60);
    expect(mock.set).toHaveBeenCalledWith('k', JSON.stringify('v'), 'EX', 60);
  });

  it('deletes a key', async () => {
    await service.set('k', 'v');
    await service.del('k');
    expect(await service.get('k')).toBeNull();
  });

  it('invalidates by pattern', async () => {
    await service.set('cache:reference:fuel:a', 1);
    await service.set('cache:reference:fuel:b', 2);
    await service.set('cache:other:x', 3);
    const removed = await service.invalidatePattern('cache:reference:*');
    expect(removed).toBe(2);
    expect(await service.get('cache:other:x')).toBe(3);
  });

  it('degrades gracefully when the client throws', async () => {
    mock.get.mockRejectedValueOnce(new Error('connection refused'));
    expect(await service.get('k')).toBeNull();
  });
});
