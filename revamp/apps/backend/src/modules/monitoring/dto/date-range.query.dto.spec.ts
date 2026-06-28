import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { DateRangeQueryDto } from './date-range.query.dto';

/** Collect the failing property names from a sync validation run. */
function failingProps(payload: Record<string, unknown>): string[] {
  const dto = plainToInstance(DateRangeQueryDto, payload);
  return validateSync(dto)
    .map((e) => e.property)
    .sort();
}

describe('DateRangeQueryDto', () => {
  it('accepts a well-formed YYYY-MM-DD window', () => {
    expect(failingProps({ dateFrom: '2026-06-01', dateTo: '2026-06-09' })).toEqual([]);
  });

  it('rejects shape-valid but impossible calendar dates (regression: 500 → 422)', () => {
    // Month 13 / day 40 passes the /^\d{4}-\d{2}-\d{2}$/ regex but is not a real
    // date; without @IsISO8601 it slipped through and crashed date parsing.
    expect(failingProps({ dateFrom: '2026-13-40', dateTo: '2026-13-99' })).toEqual([
      'dateFrom',
      'dateTo',
    ]);
  });

  it('rejects an impossible day-of-month (Feb 30)', () => {
    expect(failingProps({ dateFrom: '2026-02-30', dateTo: '2026-06-09' })).toEqual(['dateFrom']);
  });

  it('rejects a datetime (date-only contract)', () => {
    expect(failingProps({ dateFrom: '2026-06-01T10:00:00Z', dateTo: '2026-06-09' })).toEqual([
      'dateFrom',
    ]);
  });

  it('rejects a non-date string', () => {
    expect(failingProps({ dateFrom: 'not-a-date', dateTo: '2026-06-09' })).toEqual(['dateFrom']);
  });
});
