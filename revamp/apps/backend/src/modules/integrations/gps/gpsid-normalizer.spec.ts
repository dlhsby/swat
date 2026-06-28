import { normalizeGpsidPayload } from './gpsid-normalizer';

const NOW = new Date('2026-06-25T12:00:00Z');

function rawItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    VehicleId: '350000000000001',
    VehicleNumber: 'L 1234 AB',
    DatetimeUTC: '2026-06-25 11:59:30',
    Lat: -7.2575,
    Lon: 112.7521,
    Speed: 24,
    Direction: 90,
    Engine: 'ON',
    Odometer: 123456,
    Car_Status: 'START',
    ...overrides,
  };
}

describe('normalizeGpsidPayload', () => {
  it('normalizes a single object into one canonical ping', () => {
    const result = normalizeGpsidPayload(rawItem(), NOW);
    expect(result).toMatchObject({ accepted: 1, rejected: 0 });
    expect(result.pings[0]).toEqual({
      imei: '350000000000001',
      latitude: -7.2575,
      longitude: 112.7521,
      speedKmh: 24,
      heading: 90,
      engineOn: true,
      odometerM: 123456,
      recordedAt: '2026-06-25T11:59:30.000Z',
      source: 'gpsid',
      accuracyM: null,
      reportedPlate: 'L 1234 AB',
    });
  });

  it('accepts a batch (array) and counts valid items', () => {
    const result = normalizeGpsidPayload(
      [rawItem(), rawItem({ VehicleId: '350000000000002' })],
      NOW,
    );
    expect(result.accepted).toBe(2);
    expect(result.pings.map((p) => p.imei)).toEqual(['350000000000001', '350000000000002']);
  });

  it('defaults speed to 0 and heading to null when absent', () => {
    const result = normalizeGpsidPayload(rawItem({ Speed: undefined, Direction: undefined }), NOW);
    expect(result.pings[0]?.speedKmh).toBe(0);
    expect(result.pings[0]?.heading).toBeNull();
  });

  it('treats Engine OFF / ACC OFF as engine off', () => {
    expect(normalizeGpsidPayload(rawItem({ Engine: 'OFF' }), NOW).pings[0]?.engineOn).toBe(false);
    expect(normalizeGpsidPayload(rawItem({ Engine: 'ACC ON' }), NOW).pings[0]?.engineOn).toBe(true);
  });

  it('rejects an out-of-range latitude', () => {
    const result = normalizeGpsidPayload(rawItem({ Lat: 200 }), NOW);
    expect(result).toMatchObject({ accepted: 0, rejected: 1 });
  });

  it('rejects a missing IMEI', () => {
    const result = normalizeGpsidPayload(rawItem({ VehicleId: undefined }), NOW);
    expect(result.rejected).toBe(1);
  });

  it('rejects a malformed timestamp', () => {
    const result = normalizeGpsidPayload(rawItem({ DatetimeUTC: 'yesterday' }), NOW);
    expect(result.rejected).toBe(1);
  });

  it('rejects a future timestamp beyond the skew window', () => {
    const result = normalizeGpsidPayload(rawItem({ DatetimeUTC: '2026-06-25 12:30:00' }), NOW);
    expect(result.rejected).toBe(1);
  });

  it('accepts a timestamp within the 5-minute future skew', () => {
    const result = normalizeGpsidPayload(rawItem({ DatetimeUTC: '2026-06-25 12:03:00' }), NOW);
    expect(result.accepted).toBe(1);
  });

  it('drops non-object items and an empty/nullish body', () => {
    expect(normalizeGpsidPayload([rawItem(), 'garbage', 42], NOW)).toMatchObject({
      accepted: 1,
      rejected: 2,
    });
    expect(normalizeGpsidPayload(null, NOW)).toMatchObject({ accepted: 0, rejected: 0 });
  });
});
