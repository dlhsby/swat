import { describe, expect, it } from 'vitest';

import { scorePassword } from '../password-strength';

describe('scorePassword', () => {
  it('reports nothing for an empty password', () => {
    const s = scorePassword('');
    expect(s.level).toBe(0);
    expect(s.filled).toBe(0);
    expect(s.meetsRequirements).toBe(false);
  });

  it('rates a long single-class password weak', () => {
    const s = scorePassword('aaaaaaaaaaaa'); // 12 lowercase only
    expect(s.meetsRequirements).toBe(false);
    expect(s.level).toBeLessThanOrEqual(1);
  });

  it('does not meet policy below 8 chars even with all classes', () => {
    const s = scorePassword('Abc1!de'); // 7 chars, all classes
    expect(s.meetsRequirements).toBe(false);
  });

  it('meets policy at exactly 8 chars with all character classes', () => {
    // The boundary moved 12 -> 8 (2026-09-02). Character classes are unchanged,
    // so an all-digit password like 12345678 is still rejected.
    const s = scorePassword('Abcdef1!');
    expect(s.meetsRequirements).toBe(true);
  });

  it('still rejects an all-digit password at the new minimum length', () => {
    const s = scorePassword('12345678');
    expect(s.meetsRequirements).toBe(false);
  });

  it('meets policy at ≥12 chars with all character classes', () => {
    const s = scorePassword('Abcdefghij1!');
    expect(s.meetsRequirements).toBe(true);
    expect(s.level).toBe(4);
    expect(s.filled).toBe(5);
  });
});
