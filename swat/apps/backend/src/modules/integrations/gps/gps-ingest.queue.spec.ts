import { type Queue } from 'bullmq';

import { GpsIngestQueue } from './gps-ingest.queue';
import { type CanonicalPing, GPS_INGEST_JOB } from './gps.types';

function ping(): CanonicalPing {
  return {
    imei: '350000000000001',
    latitude: -7.25,
    longitude: 112.75,
    speedKmh: 10,
    heading: null,
    engineOn: false,
    odometerM: 0,
    recordedAt: '2026-06-25T10:00:00.000Z',
    source: 'gpsid',
    accuracyM: null,
    reportedPlate: null,
  };
}

describe('GpsIngestQueue', () => {
  let queue: { add: jest.Mock };
  let producer: GpsIngestQueue;

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    producer = new GpsIngestQueue(queue as unknown as Queue);
  });

  it('enqueues a batch with retry/backoff options', async () => {
    await producer.enqueue([ping()]);
    expect(queue.add).toHaveBeenCalledWith(
      GPS_INGEST_JOB,
      { pings: [expect.objectContaining({ imei: '350000000000001' })] },
      expect.objectContaining({ attempts: 5, backoff: { type: 'exponential', delay: 2000 } }),
    );
  });

  it('does nothing for an empty batch', async () => {
    await producer.enqueue([]);
    expect(queue.add).not.toHaveBeenCalled();
  });
});
