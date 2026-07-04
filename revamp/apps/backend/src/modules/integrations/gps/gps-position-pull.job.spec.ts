import { type SchedulerRegistry } from '@nestjs/schedule';

import { type SystemConfigService } from '../../../config';

import { type GpsEfficiencyRepository } from './gps-efficiency.repository';
import { type GpsIngestQueue } from './gps-ingest.queue';
import { GpsPositionPullJob, historyPointToPing } from './gps-position-pull.job';
import { type GpsidClientService, type GpsidHistoryPoint } from './gpsid-client.service';

const point = (over: Partial<GpsidHistoryPoint> = {}): GpsidHistoryPoint => ({
  latitude: -7.25,
  longitude: 112.75,
  speedKmh: 30,
  recordedAt: '2026-07-02T03:00:00.000Z',
  ...over,
});

interface Mocks {
  config: { getGpsidPositionPull: jest.Mock; getGpsidPullIntervalMinutes: jest.Mock; onChange: jest.Mock };
  gpsid: { isConfigured: boolean; getHistory: jest.Mock };
  repo: { activeDeviceImeis: jest.Mock };
  queue: { enqueue: jest.Mock };
  scheduler: { addInterval: jest.Mock };
}

function build(over: { positionPull?: boolean; intervalMin?: number } = {}): {
  job: GpsPositionPullJob;
  m: Mocks;
} {
  const m: Mocks = {
    config: {
      getGpsidPositionPull: jest.fn().mockReturnValue(over.positionPull ?? true),
      getGpsidPullIntervalMinutes: jest.fn().mockReturnValue(over.intervalMin ?? 60),
      onChange: jest.fn(),
    },
    gpsid: { isConfigured: true, getHistory: jest.fn().mockResolvedValue([]) },
    repo: { activeDeviceImeis: jest.fn().mockResolvedValue([]) },
    queue: { enqueue: jest.fn().mockResolvedValue(undefined) },
    scheduler: { addInterval: jest.fn() },
  };
  const job = new GpsPositionPullJob(
    m.config as unknown as SystemConfigService,
    m.gpsid as unknown as GpsidClientService,
    m.repo as unknown as GpsEfficiencyRepository,
    m.queue as unknown as GpsIngestQueue,
    m.scheduler as unknown as SchedulerRegistry,
  );
  return { job, m };
}

describe('historyPointToPing', () => {
  it('maps a vendor history point to a canonical gpsid ping', () => {
    const ping = historyPointToPing('350000000000000', point({ speedKmh: 42 }));
    expect(ping).toMatchObject({
      imei: '350000000000000',
      latitude: -7.25,
      longitude: 112.75,
      speedKmh: 42,
      heading: null,
      engineOn: false,
      odometerM: 0,
      source: 'gpsid',
      accuracyM: null,
      reportedPlate: null,
      recordedAt: '2026-07-02T03:00:00.000Z',
    });
  });
});

describe('GpsPositionPullJob', () => {
  describe('onModuleInit', () => {
    it('does nothing when the pull is disabled', () => {
      const { job, m } = build({ positionPull: false });
      job.onModuleInit();
      expect(m.scheduler.addInterval).not.toHaveBeenCalled();
    });

    it('does not schedule when enabled but the client is unconfigured', () => {
      const { job, m } = build();
      m.gpsid.isConfigured = false;
      job.onModuleInit();
      expect(m.scheduler.addInterval).not.toHaveBeenCalled();
    });

    it('registers an interval when enabled and configured', () => {
      const { job, m } = build();
      job.onModuleInit();
      expect(m.scheduler.addInterval).toHaveBeenCalledWith(
        'gpsid-position-pull',
        expect.anything(),
      );
    });
  });

  describe('pullPositions', () => {
    it('enqueues each active device’s mapped history points', async () => {
      const { job, m } = build();
      m.repo.activeDeviceImeis.mockResolvedValue([
        { imei: 'A', vehicleId: 'v1' },
        { imei: 'B', vehicleId: 'v2' },
      ]);
      m.gpsid.getHistory.mockImplementation((imei: string) =>
        Promise.resolve(imei === 'A' ? [point(), point({ speedKmh: 10 })] : []),
      );

      await job.pullPositions();

      // A had 2 points → one enqueue of 2 mapped pings; B had none → skipped.
      expect(m.queue.enqueue).toHaveBeenCalledTimes(1);
      const pings = m.queue.enqueue.mock.calls[0][0];
      expect(pings).toHaveLength(2);
      expect(pings[0]).toMatchObject({ imei: 'A', source: 'gpsid' });
    });

    it('no-ops when the client is unconfigured', async () => {
      const { job, m } = build();
      m.gpsid.isConfigured = false;
      await job.pullPositions();
      expect(m.repo.activeDeviceImeis).not.toHaveBeenCalled();
      expect(m.queue.enqueue).not.toHaveBeenCalled();
    });

    it('keeps going when one device errors', async () => {
      const { job, m } = build();
      m.repo.activeDeviceImeis.mockResolvedValue([
        { imei: 'A', vehicleId: 'v1' },
        { imei: 'B', vehicleId: 'v2' },
      ]);
      m.gpsid.getHistory.mockImplementation((imei: string) =>
        imei === 'A' ? Promise.reject(new Error('vendor 500')) : Promise.resolve([point()]),
      );

      await job.pullPositions();

      expect(m.queue.enqueue).toHaveBeenCalledTimes(1);
      expect(m.queue.enqueue.mock.calls[0][0][0]).toMatchObject({ imei: 'B' });
    });
  });
});
