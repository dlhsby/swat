import { type Job } from 'bullmq';

import { type DeviationMatcherService } from './deviation-matcher.service';
import { GpsIngestWorker } from './gps-ingest.worker';
import { type GpsPingRepository, type DeviceRef } from './gps-ping.repository';
import { type GpsPositionPublisher } from './gps-position.publisher';
import { type CanonicalPing, type GpsIngestJobData } from './gps.types';

const VEHICLE = '00000000-0000-0000-0000-0000000000a1';
const DEVICE = '00000000-0000-0000-0000-0000000000d1';
const IMEI = '350000000000001';

function ping(overrides: Partial<CanonicalPing> = {}): CanonicalPing {
  return {
    imei: IMEI,
    latitude: -7.2575,
    longitude: 112.7521,
    speedKmh: 20,
    heading: 90,
    engineOn: true,
    odometerM: 123456,
    recordedAt: '2026-06-25T10:00:00.000Z',
    source: 'gpsid',
    accuracyM: null,
    reportedPlate: 'L 1234 AB',
    ...overrides,
  };
}

function job(pings: CanonicalPing[]): Job<GpsIngestJobData> {
  return { data: { pings } } as unknown as Job<GpsIngestJobData>;
}

describe('GpsIngestWorker', () => {
  let repo: {
    findActiveDevicesByImei: jest.Mock;
    insertPings: jest.Mock;
    parkUnmatched: jest.Mock;
    updateDevicePosition: jest.Mock;
  };
  let publisher: { publishPosition: jest.Mock };
  let matcher: { match: jest.Mock };
  let worker: GpsIngestWorker;

  const deviceMap = (refs: DeviceRef[]): Map<string, DeviceRef> =>
    new Map(refs.map((r) => [r.imei, r]));

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      findActiveDevicesByImei: jest
        .fn()
        .mockResolvedValue(deviceMap([{ id: DEVICE, vehicleId: VEHICLE, imei: IMEI }])),
      insertPings: jest.fn().mockResolvedValue(1),
      parkUnmatched: jest.fn().mockResolvedValue(undefined),
      updateDevicePosition: jest.fn().mockResolvedValue(undefined),
    };
    publisher = { publishPosition: jest.fn().mockResolvedValue(undefined) };
    matcher = { match: jest.fn().mockResolvedValue(undefined) };
    worker = new GpsIngestWorker(
      repo as unknown as GpsPingRepository,
      publisher as unknown as GpsPositionPublisher,
      matcher as unknown as DeviationMatcherService,
    );
  });

  it('persists a matched ping and publishes its position', async () => {
    await worker.process(job([ping()]));
    expect(repo.insertPings).toHaveBeenCalledWith([
      expect.objectContaining({ vehicleId: VEHICLE, imei: IMEI, odometerM: 123456n }),
    ]);
    expect(repo.updateDevicePosition).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: DEVICE, lastLat: -7.2575 }),
    );
    expect(publisher.publishPosition).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: VEHICLE, imei: IMEI }),
    );
    expect(repo.parkUnmatched).not.toHaveBeenCalled();
  });

  it('parks an unknown IMEI and never inserts it', async () => {
    repo.findActiveDevicesByImei.mockResolvedValue(new Map());
    await worker.process(job([ping({ imei: '359999999999999' })]));
    expect(repo.parkUnmatched).toHaveBeenCalledWith([
      expect.objectContaining({ imei: '359999999999999' }),
    ]);
    expect(repo.insertPings).not.toHaveBeenCalled();
    expect(publisher.publishPosition).not.toHaveBeenCalled();
  });

  it('updates the device to the LATEST ping in the batch only once', async () => {
    await worker.process(
      job([
        ping({ recordedAt: '2026-06-25T10:00:00.000Z', latitude: -7.1 }),
        ping({ recordedAt: '2026-06-25T10:05:00.000Z', latitude: -7.2 }),
      ]),
    );
    expect(repo.updateDevicePosition).toHaveBeenCalledTimes(1);
    expect(repo.updateDevicePosition).toHaveBeenCalledWith(
      expect.objectContaining({ lastLat: -7.2, lastPingAt: new Date('2026-06-25T10:05:00.000Z') }),
    );
  });

  it('handles a mixed batch (some matched, some unknown)', async () => {
    await worker.process(job([ping(), ping({ imei: '359999999999999' })]));
    expect(repo.insertPings).toHaveBeenCalledWith([expect.objectContaining({ imei: IMEI })]);
    expect(repo.parkUnmatched).toHaveBeenCalledWith([
      expect.objectContaining({ imei: '359999999999999' }),
    ]);
  });

  it('is a no-op for an empty batch', async () => {
    await worker.process(job([]));
    expect(repo.findActiveDevicesByImei).not.toHaveBeenCalled();
    expect(repo.insertPings).not.toHaveBeenCalled();
  });
});
