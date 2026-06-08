import { resolveCorsOrigin } from './cors';

describe('resolveCorsOrigin', () => {
  it('reflects the request origin when unset', () => {
    expect(resolveCorsOrigin()).toBe(true);
    expect(resolveCorsOrigin('')).toBe(true);
    expect(resolveCorsOrigin(null)).toBe(true);
  });

  it('parses a comma-separated allowlist, trimming blanks', () => {
    expect(resolveCorsOrigin('https://a.id, https://b.id')).toEqual([
      'https://a.id',
      'https://b.id',
    ]);
  });

  it('falls back to true when the list is all blanks', () => {
    expect(resolveCorsOrigin('  ,  ')).toBe(true);
  });
});
