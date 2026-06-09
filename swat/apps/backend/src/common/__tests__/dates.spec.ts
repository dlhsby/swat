import {
  addDays,
  formatDateOnly,
  formatTimeOnly,
  parseDateOnly,
  parseTimeOnly,
  startOfMonth,
  startOfNextMonth,
  trailingDates,
} from '../dates';

describe('date/time helpers', () => {
  it('round-trips a date-only value (UTC-anchored)', () => {
    const d = parseDateOnly('2026-06-08');
    expect(d.toISOString()).toBe('2026-06-08T00:00:00.000Z');
    expect(formatDateOnly(d)).toBe('2026-06-08');
  });

  it('round-trips a time-only value independent of server timezone', () => {
    const t = parseTimeOnly('05:30');
    expect(t.toISOString()).toBe('1970-01-01T05:30:00.000Z');
    expect(formatTimeOnly(t)).toBe('05:30');
  });

  it('formats midnight and end-of-day times', () => {
    expect(formatTimeOnly(parseTimeOnly('00:00'))).toBe('00:00');
    expect(formatTimeOnly(parseTimeOnly('23:59'))).toBe('23:59');
  });

  it('adds and subtracts days across month boundaries', () => {
    expect(formatDateOnly(addDays(parseDateOnly('2026-06-08'), 3))).toBe('2026-06-11');
    expect(formatDateOnly(addDays(parseDateOnly('2026-06-01'), -1))).toBe('2026-05-31');
    expect(formatDateOnly(addDays(parseDateOnly('2026-03-01'), -1))).toBe('2026-02-28');
  });

  it('resolves month boundaries (UTC-anchored)', () => {
    expect(formatDateOnly(startOfMonth(parseDateOnly('2026-06-18')))).toBe('2026-06-01');
    expect(formatDateOnly(startOfNextMonth(parseDateOnly('2026-06-18')))).toBe('2026-07-01');
    expect(formatDateOnly(startOfNextMonth(parseDateOnly('2026-12-09')))).toBe('2027-01-01');
  });

  it('lists a trailing window oldest-first, inclusive of the end date', () => {
    const window = trailingDates(parseDateOnly('2026-06-03'), 3).map(formatDateOnly);
    expect(window).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });
});
