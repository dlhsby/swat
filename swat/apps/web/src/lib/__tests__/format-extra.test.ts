import { describe, expect, it } from 'vitest';

import { formatNumber, initialsOf } from '../format';

describe('initialsOf', () => {
  it('takes the first letters of the first and last words', () => {
    expect(initialsOf('Budi Santoso')).toBe('BS');
    expect(initialsOf('Administrator')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf('siti aminah putri')).toBe('SP');
  });
});

describe('formatNumber', () => {
  it('groups thousands with id-ID separators', () => {
    expect(formatNumber(1250)).toBe('1.250');
    expect(formatNumber(0)).toBe('0');
  });
});
