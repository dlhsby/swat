import { averagePerTransaction, fuelVariance } from './monitoring.math';

describe('fuelVariance', () => {
  it('flags under-approval beyond -5% as RED', () => {
    expect(fuelVariance(80, 100)).toEqual({ variancePercent: -20, flag: 'RED' });
  });

  it('keeps small variance OK', () => {
    expect(fuelVariance(98, 100)).toEqual({ variancePercent: -2, flag: 'OK' });
    expect(fuelVariance(100, 100)).toEqual({ variancePercent: 0, flag: 'OK' });
  });

  it('returns 0% when nothing was requested', () => {
    expect(fuelVariance(0, 0)).toEqual({ variancePercent: 0, flag: 'OK' });
  });
});

describe('averagePerTransaction', () => {
  it('rounds to integer IDR', () => {
    expect(averagePerTransaction(1000, 3)).toBe(333);
  });

  it('guards divide-by-zero', () => {
    expect(averagePerTransaction(1000, 0)).toBe(0);
  });
});
