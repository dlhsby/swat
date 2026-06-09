import { averagePerTransaction, fuelVariance, reconciliationStatus } from './monitoring.math';

describe('reconciliationStatus', () => {
  it('is PENDING when no weighbridge total exists', () => {
    expect(reconciliationStatus(45000, null)).toBe('PENDING');
  });

  it('is MATCHED within the 5% tolerance', () => {
    expect(reconciliationStatus(4000, 4200)).toBe('MATCHED'); // 5% exactly
    expect(reconciliationStatus(45000, 44800)).toBe('MATCHED');
  });

  it('is DISCREPANCY beyond tolerance', () => {
    expect(reconciliationStatus(4000, 4600)).toBe('DISCREPANCY'); // 15%
  });

  it('treats a zero/zero day as matched but zero/non-zero as a discrepancy', () => {
    expect(reconciliationStatus(0, 0)).toBe('MATCHED');
    expect(reconciliationStatus(0, 500)).toBe('DISCREPANCY');
  });
});

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
