import { type FuelVarianceFlag, type ReconciliationStatus } from './monitoring.types';

/** Tonnage reconciliation tolerance — a TPA-vs-trip gap beyond this is an anomaly. */
export const RECONCILIATION_TOLERANCE_PERCENT = 5;
/** Fuel under-approval beyond this (negative) variance is flagged RED. */
export const FUEL_VARIANCE_RED_PERCENT = -5;

/**
 * Compare trip-derived daily tonnage against the weighbridge (TpaInboundLog) total
 * for the same day. No weighbridge row → PENDING; within tolerance (or both zero)
 * → MATCHED; otherwise DISCREPANCY (specs/09-modules/monitoring.md §business rules).
 */
export function reconciliationStatus(dailyKg: number, tpaKg: number | null): ReconciliationStatus {
  if (tpaKg === null) {
    return 'PENDING';
  }
  if (dailyKg === 0) {
    return tpaKg === 0 ? 'MATCHED' : 'DISCREPANCY';
  }
  const diffPercent = (Math.abs(dailyKg - tpaKg) / dailyKg) * 100;
  return diffPercent <= RECONCILIATION_TOLERANCE_PERCENT ? 'MATCHED' : 'DISCREPANCY';
}

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
