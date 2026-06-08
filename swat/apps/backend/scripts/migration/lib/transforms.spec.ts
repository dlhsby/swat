import {
  clampNonNegative,
  dedupeRoutes,
  fixDate,
  fixGps,
  fixYear,
  legacyTimeToDate,
  nonNegativeOrNull,
  routeDedupeKey,
  trimOrNull,
} from './transforms';

const NOW = new Date('2026-06-08T00:00:00.000Z');

describe('fixDate', () => {
  it('nulls zero-dates and empties', () => {
    expect(fixDate('0000-00-00')).toBeNull();
    expect(fixDate('0000-00-00 00:00:00')).toBeNull();
    expect(fixDate('')).toBeNull();
    expect(fixDate(null)).toBeNull();
  });
  it('parses a valid date', () => {
    expect(fixDate('2026-05-18')?.toISOString().slice(0, 10)).toBe('2026-05-18');
  });
  it('passes through a valid Date and nulls an invalid one', () => {
    const d = new Date('2020-01-01T00:00:00Z');
    expect(fixDate(d)).toBe(d);
    expect(fixDate(new Date('nope'))).toBeNull();
  });
});

describe('fixYear', () => {
  it('nulls bogus 1900 and out-of-range years', () => {
    expect(fixYear(1900, NOW)).toBeNull();
    expect(fixYear(1850, NOW)).toBeNull();
    expect(fixYear(2100, NOW)).toBeNull();
  });
  it('keeps valid years (1960..current+1) and coerces strings', () => {
    expect(fixYear(2015, NOW)).toBe(2015);
    expect(fixYear('2027', NOW)).toBe(2027); // current+1
    expect(fixYear(null, NOW)).toBeNull();
  });
});

describe('fixGps', () => {
  it('nulls (0,0) and out-of-range coordinates', () => {
    expect(fixGps(0, 0)).toEqual({ latitude: null, longitude: null });
    expect(fixGps(-200, 500)).toEqual({ latitude: null, longitude: null });
  });
  it('keeps valid Surabaya coordinates (string or number)', () => {
    expect(fixGps('-7.25', '112.75')).toEqual({ latitude: -7.25, longitude: 112.75 });
  });
});

describe('clampNonNegative / nonNegativeOrNull', () => {
  it('clamps negatives and NaN to 0', () => {
    expect(clampNonNegative(-5)).toBe(0);
    expect(clampNonNegative('abc')).toBe(0);
    expect(clampNonNegative(12.9)).toBe(12);
  });
  it('nulls empties/negatives but keeps valid', () => {
    expect(nonNegativeOrNull(null)).toBeNull();
    expect(nonNegativeOrNull(-3)).toBeNull();
    expect(nonNegativeOrNull(7)).toBe(7);
  });
});

describe('trimOrNull', () => {
  it('trims and nulls empty', () => {
    expect(trimOrNull('  AKTIF ')).toBe('AKTIF');
    expect(trimOrNull('   ')).toBeNull();
    expect(trimOrNull(null)).toBeNull();
  });
});

describe('legacyTimeToDate', () => {
  it('anchors HH:MM:SS to 1970-01-01 UTC', () => {
    expect(legacyTimeToDate('06:30:00')?.toISOString()).toBe('1970-01-01T06:30:00.000Z');
    expect(legacyTimeToDate('06:30')?.toISOString()).toBe('1970-01-01T06:30:00.000Z');
  });
  it('nulls invalid input', () => {
    expect(legacyTimeToDate('')).toBeNull();
    expect(legacyTimeToDate('nope')).toBeNull();
  });
});

describe('dedupeRoutes', () => {
  it('keeps first occurrence and reports dropped duplicates', () => {
    const rows = [
      { id: 1, o: 1, d: 2, c: 3 },
      { id: 2, o: 1, d: 2, c: 3 },
      { id: 3, o: 5, d: 6, c: 3 },
    ];
    const { kept, dropped } = dedupeRoutes(rows, (r) => routeDedupeKey(r.o, r.d, r.c));
    expect(kept.map((r) => r.id)).toEqual([1, 3]);
    expect(dropped.map((r) => r.id)).toEqual([2]);
  });
});
