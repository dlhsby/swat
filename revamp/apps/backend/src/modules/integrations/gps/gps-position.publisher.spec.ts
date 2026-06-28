import { type CacheService } from '../../cache/cache.service';

import { GpsPositionPublisher } from './gps-position.publisher';

describe('GpsPositionPublisher', () => {
  let cache: { publish: jest.Mock };
  let publisher: GpsPositionPublisher;

  beforeEach(() => {
    cache = { publish: jest.fn().mockResolvedValue(1) };
    publisher = new GpsPositionPublisher(cache as unknown as CacheService);
  });

  it('publishes a position event tagged type=position to gps:positions', async () => {
    await publisher.publishPosition({
      vehicleId: 'v1',
      imei: '350000000000001',
      latitude: -7.25,
      longitude: 112.75,
      speedKmh: 20,
      heading: 90,
      engineOn: true,
      recordedAt: '2026-06-25T10:00:00.000Z',
      source: 'gpsid',
    });
    expect(cache.publish).toHaveBeenCalledWith(
      'gps:positions',
      expect.objectContaining({ type: 'position', vehicleId: 'v1', imei: '350000000000001' }),
    );
  });

  it('publishes a status event tagged type=status', async () => {
    await publisher.publishStatus({ vehicleId: 'v2', status: 'offline' });
    expect(cache.publish).toHaveBeenCalledWith('gps:positions', {
      type: 'status',
      vehicleId: 'v2',
      status: 'offline',
    });
  });
});
