import { toDateKey, toInstant } from './gasification-client.service';
import { normalizePlate } from './gasification.types';

describe('normalizePlate', () => {
  it('strips non-alphanumerics and uppercases', () => {
    expect(normalizePlate('L 9647 CM')).toBe('L9647CM');
    expect(normalizePlate('l-9647-cm')).toBe('L9647CM');
    expect(normalizePlate('L9647CM')).toBe('L9647CM');
  });

  it('returns empty string for blank input', () => {
    expect(normalizePlate('')).toBe('');
    expect(normalizePlate(null)).toBe('');
    expect(normalizePlate(undefined)).toBe('');
  });
});

describe('toDateKey', () => {
  it('accepts ISO dates', () => {
    expect(toDateKey('2026-05-07')).toBe('2026-05-07');
    expect(toDateKey('2026-05-07 14:00:00')).toBe('2026-05-07');
  });

  it('converts DD-MM-YYYY', () => {
    expect(toDateKey('7-5-2026')).toBe('2026-05-07');
    expect(toDateKey('07-05-2026')).toBe('2026-05-07');
  });

  it('rejects unrecognizable input', () => {
    expect(toDateKey('not a date')).toBeNull();
    expect(toDateKey(null)).toBeNull();
    expect(toDateKey(1234)).toBeNull();
  });
});

describe('toInstant', () => {
  it('combines a WIB date + time into the correct UTC instant (UTC+7)', () => {
    // 14:00 WIB on 2026-05-07 is 07:00Z the same day.
    expect(toInstant('2026-05-07', '14:00:00').toISOString()).toBe('2026-05-07T07:00:00.000Z');
    expect(toInstant('2026-05-07', '14:00').toISOString()).toBe('2026-05-07T07:00:00.000Z');
  });

  it('defaults to midnight WIB when the time is unparsable', () => {
    // 00:00 WIB is 17:00Z the previous day.
    expect(toInstant('2026-05-07', 'garbage').toISOString()).toBe('2026-05-06T17:00:00.000Z');
  });
});
