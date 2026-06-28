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

  it('does not meet policy below 12 chars even with all classes', () => {
    const s = scorePassword('Abcdef1!'); // 8 chars, all classes
    expect(s.meetsRequirements).toBe(false);
  });

  it('meets policy at ≥12 chars with all character classes', () => {
    const s = scorePassword('Abcdefghij1!');
    expect(s.meetsRequirements).toBe(true);
    expect(s.level).toBe(4);
    expect(s.filled).toBe(5);
  });
});
