import {
  addDays,
  anchorInstantToOperationDate,
  formatDateOnly,
  formatTimeOnly,
  parseDateOnly,
  parseTimeOnly,
  startOfMonth,
  startOfNextMonth,
  trailingDates,
  wibDateKey,
} from '../dates';

describe('date/time helpers', () => {
  it('round-trips a date-only value (UTC-anchored)', () => {
    const d = parseDateOnly('2026-06-08');
    expect(d.toISOString()).toBe('2026-06-08T00:00:00.000Z');
    expect(formatDateOnly(d)).toBe('2026-06-08');
  });

  describe('WIB anchoring of realization timestamps', () => {
    it('reads the WIB calendar date of an instant (incl. the UTC-day boundary)', () => {
      // 01:00 WIB on 23 Jun is 18:00 UTC on 22 Jun — still the 23rd in WIB.
      expect(wibDateKey(new Date('2026-06-22T18:00:00Z'))).toBe('2026-06-23');
      expect(wibDateKey(new Date('2026-06-23T07:00:00+07:00'))).toBe('2026-06-23');
    });

    it('returns an already-aligned instant unchanged', () => {
      const op = parseDateOnly('2026-06-23');
      const earlyMorning = new Date('2026-06-23T01:00:00+07:00'); // WIB date == op
      expect(anchorInstantToOperationDate(earlyMorning, op).toISOString()).toBe(
        earlyMorning.toISOString(),
      );
    });

    it('shifts a wrong-day instant onto the operation day, keeping the WIB time', () => {
      const op = parseDateOnly('2026-06-23');
      const wrongDay = new Date('2026-06-24T07:00:00+07:00'); // 07:00 WIB, but on the 24th
      const fixed = anchorInstantToOperationDate(wrongDay, op);
      expect(wibDateKey(fixed)).toBe('2026-06-23'); // now on the operation day…
      expect(fixed.toISOString()).toBe('2026-06-23T00:00:00.000Z'); // …at the same 07:00 WIB
    });
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
