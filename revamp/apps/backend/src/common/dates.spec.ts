import { operationDateOf, wibDayRangeUtc } from './dates';

describe('operationDateOf', () => {
  it('keys a ping to its WIB calendar day, not its UTC day', () => {
    // 2026-07-02T19:00Z is 2026-07-03 02:00 WIB → belongs to operation day Jul 3.
    expect(operationDateOf(new Date('2026-07-02T19:00:00.000Z')).toISOString()).toBe(
      '2026-07-03T00:00:00.000Z',
    );
    // A WIB-daytime ping stays on the same day.
    expect(operationDateOf(new Date('2026-07-03T05:00:00.000Z')).toISOString()).toBe(
      '2026-07-03T00:00:00.000Z',
    );
    // 2026-07-03T17:00Z is already 2026-07-04 00:00 WIB → next operation day.
    expect(operationDateOf(new Date('2026-07-03T17:00:00.000Z')).toISOString()).toBe(
      '2026-07-04T00:00:00.000Z',
    );
  });
});

describe('wibDayRangeUtc', () => {
  it('bounds a WIB day as [prev 17:00Z, day 17:00Z)', () => {
    const { start, end } = wibDayRangeUtc('2026-07-03');
    expect(start.toISOString()).toBe('2026-07-02T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-03T17:00:00.000Z');
  });
});
