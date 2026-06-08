import { describe, expect, it } from 'vitest';

import { parseCsv, toCsv } from '../csv';

describe('parseCsv', () => {
  it('parses headers and keyed rows', () => {
    const { headers, rows } = parseCsv('a,b,c\n1,2,3\n4,5,6');
    expect(headers).toEqual(['a', 'b', 'c']);
    expect(rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  it('handles quoted fields with commas and escaped quotes', () => {
    const { rows } = parseCsv('name,note\n"Doe, John","say ""hi"""');
    expect(rows[0]).toEqual({ name: 'Doe, John', note: 'say "hi"' });
  });

  it('skips blank lines and trims headers/cells', () => {
    const { rows } = parseCsv(' a , b \n\n 1 , 2 \n');
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns empty for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
  });

  it('handles CRLF line endings', () => {
    const { rows } = parseCsv('a,b\r\n1,2\r\n');
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });
});

describe('toCsv', () => {
  it('escapes fields containing commas, quotes, and newlines', () => {
    const out = toCsv(['row', 'reason'], [{ row: 1, reason: 'a, "b"' }]);
    expect(out).toBe('row,reason\n1,"a, ""b"""');
  });
});
