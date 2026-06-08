import { formatDateOnly, formatTimeOnly, parseDateOnly, parseTimeOnly } from '../dates';

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
});
