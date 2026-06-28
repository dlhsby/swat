import { type FuelVarianceFlag } from './monitoring.types';

/** Fuel under-approval beyond this (negative) variance is flagged RED. */
export const FUEL_VARIANCE_RED_PERCENT = -5;

/**
 * Fuel approved-vs-requested variance as a signed percentage of the requested
 * amount. Under-approval beyond the threshold flags RED. Zero requested → 0%.
 */
export function fuelVariance(
  approved: number,
  requested: number,
): { variancePercent: number; flag: FuelVarianceFlag } {
  const variancePercent =
    requested === 0 ? 0 : Math.round(((approved - requested) / requested) * 1000) / 10;
  return {
    variancePercent,
    flag: variancePercent < FUEL_VARIANCE_RED_PERCENT ? 'RED' : 'OK',
  };
}

/** Integer-IDR average per transaction, guarding against divide-by-zero. */
export function averagePerTransaction(total: number, count: number): number {
  return count === 0 ? 0 : Math.round(total / count);
}
