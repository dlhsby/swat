import { type TransactionDayDto } from './types/transactions';

export interface DayMetrics {
  /** Vehicles with a haul materialized for the day. */
  readonly activeVehicles: number;
  /** Hauls not yet closed. */
  readonly runningHauls: number;
  /** Approved litres across recorded REFUEL trips. */
  readonly fuelLiters: number;
  /** Net tonnage across recorded DISPOSAL trips (kg → ton). */
  readonly tonnage: number;
  /** Recorded-but-unverified trips awaiting a checker. */
  readonly awaitingVerification: number;
}

/** Derive the dashboard metrics from a day's haul/assignment/trip tree. */
export function deriveDayMetrics(day: TransactionDayDto | null): DayMetrics {
  if (!day) {
    return {
      activeVehicles: 0,
      runningHauls: 0,
      fuelLiters: 0,
      tonnage: 0,
      awaitingVerification: 0,
    };
  }

  let fuelLiters = 0;
  let netKg = 0;
  let awaitingVerification = 0;
  let runningHauls = 0;

  for (const haul of day.hauls) {
    if (haul.status !== 'DONE') {
      runningHauls += 1;
    }
    for (const assignment of haul.assignments) {
      for (const trip of assignment.trips) {
        if (trip.routeCategory === 'REFUEL' && trip.fuelApprovedLiters) {
          fuelLiters += trip.fuelApprovedLiters;
        }
        if (trip.netWeight) {
          netKg += trip.netWeight;
        }
        if (trip.status === 'DONE') {
          awaitingVerification += 1;
        }
      }
    }
  }

  return {
    activeVehicles: day.hauls.length,
    runningHauls,
    fuelLiters,
    tonnage: netKg / 1000,
    awaitingVerification,
  };
}
