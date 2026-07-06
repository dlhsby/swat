import { Injectable, Logger } from '@nestjs/common';

import {
  type ActivityEventRow,
  type DailyTripRealization,
  type FleetVehicle,
  GpsEfficiencyRepository,
} from './gps-efficiency.repository';

interface TripAgg {
  plannedMeters: number;
  lateMinutes: number;
  minOdo: number;
  maxOdo: number;
  count: number;
}

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Sum each vehicle's ARRIVE → next-event duration (minutes) from the day's
 * `GpsActivityEvent` feed — legitimate site dwell time (loading/dumping), not a
 * deviation. Events are pre-sorted per vehicle by `occurredAt`; an ARRIVE with
 * no matching close-out today (still open at day-end) contributes nothing.
 */
export function computeDwellMinutesByVehicle(
  events: readonly ActivityEventRow[],
): Map<string, number> {
  const totals = new Map<string, number>();
  let openVehicle: string | null = null;
  let openArriveAt: Date | null = null;
  for (const e of events) {
    if (openVehicle !== e.vehicleId) {
      openVehicle = e.vehicleId;
      openArriveAt = null;
    }
    if (e.kind === 'ARRIVE') {
      openArriveAt = e.occurredAt;
      continue;
    }
    if (openArriveAt) {
      const minutes = (e.occurredAt.getTime() - openArriveAt.getTime()) / 60_000;
      totals.set(e.vehicleId, (totals.get(e.vehicleId) ?? 0) + Math.max(0, minutes));
      openArriveAt = null;
    }
  }
  return totals;
}

/**
 * Per-vehicle/day efficiency rollup (Phase 7, T-719/720). Degrades gracefully by
 * coverage:
 *  - tracked (has device): actual distance from the device odometer delta
 *    (primary); else recorded odometer.
 *  - untracked: actual distance from the operator-recorded `Trip.actualOdometer`.
 * Late minutes from realization; deviation count from the day's alerts; an
 * internal wasted-fuel estimate (extra distance ÷ km/L). `dwellMinutes` sums
 * ARRIVE→exit durations from the activity feed; `adherencePct` is the share of
 * the day's GPS pings within tolerance of any of today's corridors. Both stay
 * NULL ("not measurable", not 0) for untracked vehicles or vehicles with no
 * activity/corridor data that day. The nightly GPS.id mileage reconcile (T-720)
 * fills `gpsidFuelLiters` separately.
 */
@Injectable()
export class GpsEfficiencyService {
  private readonly logger = new Logger(GpsEfficiencyService.name);

  constructor(private readonly repo: GpsEfficiencyRepository) {}

  /** Recompute the efficiency rows for one operation date. Idempotent. */
  async refreshForDate(date: Date): Promise<number> {
    const day = utcMidnight(date);
    const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);

    const vehicles = new Map<string, FleetVehicle>(
      (await this.repo.vehicles()).map((v) => [v.id, v]),
    );
    const trips = await this.repo.tripRealizations(day);
    const odoRanges = await this.repo.odometerRanges(day, dayEnd);
    const deviationCounts = await this.repo.deviationCounts(day, dayEnd);
    const dwellByVehicle = computeDwellMinutesByVehicle(
      await this.repo.activityEvents(day, dayEnd),
    );
    const corridorsByVehicle = await this.repo.dailyCorridorsByVehicle(day);

    const tripsByVehicle = this.aggregateTrips(trips, day);
    const vehicleIds = new Set<string>([...tripsByVehicle.keys(), ...odoRanges.keys()]);

    let written = 0;
    for (const vehicleId of vehicleIds) {
      const vehicle = vehicles.get(vehicleId);
      if (!vehicle) continue;
      const agg = tripsByVehicle.get(vehicleId);
      const odo = odoRanges.get(vehicleId);

      const plannedMeters = agg?.plannedMeters ?? 0;
      const actualMeters =
        vehicle.hasDevice && odo
          ? Number(odo.maxM - odo.minM)
          : agg
            ? Math.max(0, (agg.maxOdo - agg.minOdo) * 1000)
            : 0;
      const lateMinutes = agg?.lateMinutes ?? 0;
      const extraKm = Math.max(0, actualMeters - plannedMeters) / 1000;
      const wastedFuelLiters =
        vehicle.currentFuelRatio > 0 ? Number((extraKm / vehicle.currentFuelRatio).toFixed(2)) : 0;

      const dwellMinutes = dwellByVehicle.get(vehicleId);
      let adherencePct: number | null = null;
      if (vehicle.hasDevice) {
        const corridors = corridorsByVehicle.get(vehicleId) ?? [];
        if (corridors.length > 0) {
          const { within, total } = await this.repo.pingAdherence(
            vehicleId,
            day,
            dayEnd,
            corridors,
          );
          if (total > 0) adherencePct = Math.round((within / total) * 10_000) / 100;
        }
      }

      await this.repo.upsert(day, vehicleId, {
        positionSource: vehicle.hasDevice ? 'gps' : 'recorded',
        plannedMeters: Math.round(plannedMeters),
        actualMeters: Math.round(actualMeters),
        lateMinutes,
        wastedFuelLiters,
        deviationCount: deviationCounts.get(vehicleId) ?? 0,
        adherencePct,
        dwellMinutes: dwellMinutes !== undefined ? Number(dwellMinutes.toFixed(2)) : null,
      });
      written += 1;
    }
    this.logger.log(
      `Efficiency rollup ${day.toISOString().slice(0, 10)}: ${written} vehicle rows.`,
    );
    return written;
  }

  /** Recompute an inclusive date range (backfill / nightly heal). */
  async backfill(from: Date, to: Date): Promise<number> {
    let total = 0;
    for (let d = utcMidnight(from); d <= to; d = new Date(d.getTime() + 86_400_000)) {
      total += await this.refreshForDate(d);
    }
    return total;
  }

  private aggregateTrips(trips: DailyTripRealization[], day: Date): Map<string, TripAgg> {
    const byVehicle = new Map<string, TripAgg>();
    for (const trip of trips) {
      const agg = byVehicle.get(trip.vehicleId) ?? {
        plannedMeters: 0,
        lateMinutes: 0,
        minOdo: Number.MAX_SAFE_INTEGER,
        maxOdo: 0,
        count: 0,
      };
      agg.plannedMeters += trip.plannedMeters;
      if (trip.targetTime && trip.actualTime) {
        const late = Math.round((trip.actualTime.getTime() - trip.targetTime.getTime()) / 60_000);
        agg.lateMinutes = Math.max(agg.lateMinutes, Math.max(0, late));
      }
      if (trip.actualOdometer > 0) {
        agg.minOdo = Math.min(agg.minOdo, trip.actualOdometer);
        agg.maxOdo = Math.max(agg.maxOdo, trip.actualOdometer);
      }
      agg.count += 1;
      byVehicle.set(trip.vehicleId, agg);
    }
    // Normalize the sentinel min for vehicles with no odometer reading.
    for (const agg of byVehicle.values()) {
      if (agg.minOdo === Number.MAX_SAFE_INTEGER) agg.minOdo = agg.maxOdo;
    }
    void day;
    return byVehicle;
  }
}
