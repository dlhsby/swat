import { type AppConfigService } from '../../../config/config.service';

import { GpsDeviceOfflineJob } from './gps-device-offline.job';
import { type GpsPingRepository } from './gps-ping.repository';
import { type GpsPositionPublisher } from './gps-position.publisher';

describe('GpsDeviceOfflineJob', () => {
  let repo: { markStaleDevicesOffline: jest.Mock };
  let publisher: { publishStatus: jest.Mock };
  let job: GpsDeviceOfflineJob;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = { markStaleDevicesOffline: jest.fn().mockResolvedValue([]) };
    publisher = { publishStatus: jest.fn().mockResolvedValue(undefined) };
    const config = { gps: { deviceOfflineMinutes: 10 } } as unknown as AppConfigService;
    job = new GpsDeviceOfflineJob(
      repo as unknown as GpsPingRepository,
      publisher as unknown as GpsPositionPublisher,
      config,
    );
  });

  it('publishes an offline status for each flipped device', async () => {
    repo.markStaleDevicesOffline.mockResolvedValue([
      { id: 'd1', vehicleId: 'v1' },
      { id: 'd2', vehicleId: 'v2' },
    ]);
    await job.sweep();
    expect(publisher.publishStatus).toHaveBeenCalledTimes(2);
    expect(publisher.publishStatus).toHaveBeenCalledWith({ vehicleId: 'v1', status: 'offline' });
  });

  it('uses the configured offline window for the cutoff', async () => {
    await job.sweep();
    const cutoff = repo.markStaleDevicesOffline.mock.calls[0]?.[0] as Date;
    const ageMs = Date.now() - cutoff.getTime();
    // ~10 minutes ± a small execution window.
    expect(ageMs).toBeGreaterThanOrEqual(10 * 60_000 - 2000);
    expect(ageMs).toBeLessThanOrEqual(10 * 60_000 + 2000);
  });

  it('publishes nothing when no device is stale', async () => {
    await job.sweep();
    expect(publisher.publishStatus).not.toHaveBeenCalled();
  });
});
