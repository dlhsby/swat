import { type AppConfigService } from '../../config/config.service';

import { RealtimeService, type RealtimeEvent } from './realtime.service';

const mockState: { handler?: (channel: string, message: string) => void } = {};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: (event: string, cb: (channel: string, message: string) => void) => {
      if (event === 'message') mockState.handler = cb;
    },
    subscribe: () => Promise.resolve(),
    quit: () => Promise.resolve(),
    disconnect: () => undefined,
  })),
}));

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    mockState.handler = undefined;
    service = new RealtimeService({ redisUrl: 'redis://localhost:6379' } as AppConfigService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('emits parsed Redis messages on the stream', () => {
    const events: RealtimeEvent[] = [];
    service.stream().subscribe((e) => events.push(e));

    mockState.handler?.('gps:positions', JSON.stringify({ vehicleId: 'v1', latitude: -7.25 }));
    mockState.handler?.('gps:alerts', JSON.stringify({ vehicleId: 'v1', id: 'a1' }));

    expect(events).toEqual([
      { channel: 'gps:positions', payload: { vehicleId: 'v1', latitude: -7.25 } },
      { channel: 'gps:alerts', payload: { vehicleId: 'v1', id: 'a1' } },
    ]);
  });

  it('drops a malformed message without breaking the stream', () => {
    const events: RealtimeEvent[] = [];
    service.stream().subscribe((e) => events.push(e));

    mockState.handler?.('gps:positions', 'not-json');
    mockState.handler?.('gps:positions', JSON.stringify({ vehicleId: 'v2' }));

    expect(events).toEqual([{ channel: 'gps:positions', payload: { vehicleId: 'v2' } }]);
  });
});
