import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface FleetVehicle {
  readonly id: string;
  readonly currentFuelRatio: number;
  readonly hasDevice: boolean;
}

export interface DailyTripRealization {
  readonly vehicleId: string;
  readonly targetTime: Date | null;
  readonly actualTime: Date | null;
  readonly actualOdometer: number;
  readonly plannedMeters: number;
}

export interface OdometerRange {
  readonly minM: bigint;
  readonly maxM: bigint;
}

export interface ActivityEventRow {
  readonly vehicleId: string;
  readonly kind: string;
  readonly occurredAt: Date;
}

export interface TripCorridor {
  readonly pathGeojson: unknown;
  readonly toleranceMeters: number;
}

@Injectable()
export class GpsEfficiencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active vehicles with their fuel ratio + whether they have a hardware tracker. */
  async vehicles(): Promise<FleetVehicle[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        currentFuelRatio: true,
        gpsDevices: {
          where: { active: true, deviceType: 'gps-hardware' },
          select: { id: true },
          take: 1,
        },
      },
    });
    return rows.map((v) => ({
      id: v.id,
      currentFuelRatio: v.currentFuelRatio,
      hasDevice: v.gpsDevices.length > 0,
    }));
  }

  /**
   * Today's trips per vehicle with planned distance. Planned metres follow the same
   * precedence as the deviation resolver: the day's chosen corridor → the route's
   * default corridor → the legacy `route_geometry` → the route's `distanceKm`.
   */
  async tripRealizations(operationDate: Date): Promise<DailyTripRealization[]> {
    const trips = await this.prisma.trip.findMany({
      where: { operationDate },
      select: {
        targetTime: true,
        actualTime: true,
        actualOdometer: true,
        haulAssignment: { select: { haul: { select: { vehicleId: true } } } },
        corridor: { select: { lengthMeters: true, deletedAt: true } },
        route: {
          select: {
            distanceKm: true,
            geometry: { select: { lengthMeters: true } },
            corridors: {
              where: { isDefault: true, deletedAt: null },
              select: { lengthMeters: true },
              take: 1,
            },
          },
        },
      },
    });
    return trips.map((t) => {
      // A soft-deleted chosen corridor is ignored (parity with the resolver).
      const chosen = t.corridor && t.corridor.deletedAt == null ? t.corridor.lengthMeters : null;
      const corridorMeters =
        chosen ?? t.route?.corridors[0]?.lengthMeters ?? t.route?.geometry?.lengthMeters ?? null;
      return {
        vehicleId: t.haulAssignment.haul.vehicleId,
        targetTime: t.targetTime,
        actualTime: t.actualTime,
        actualOdometer: t.actualOdometer,
        plannedMeters: corridorMeters ?? (t.route?.distanceKm ?? 0) * 1000,
      };
    });
  }

  /** Device-odometer min/max per vehicle for the day (the primary distance source). */
  async odometerRanges(dayStart: Date, dayEnd: Date): Promise<Map<string, OdometerRange>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ vehicleId: string; minM: bigint; maxM: bigint }>
    >`
      SELECT "vehicle_id" AS "vehicleId", MIN("odometer_m") AS "minM", MAX("odometer_m") AS "maxM"
      FROM "gps_ping"
      WHERE "recorded_at" >= ${dayStart} AND "recorded_at" < ${dayEnd}
      GROUP BY "vehicle_id"
    `;
    return new Map(rows.map((r) => [r.vehicleId, { minM: r.minM, maxM: r.maxM }]));
  }

  /** Deviation-alert counts per vehicle for the day. */
  async deviationCounts(dayStart: Date, dayEnd: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.deviationAlert.groupBy({
      by: ['vehicleId'],
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.vehicleId, r._count._all]));
  }

  /**
   * GpsActivityEvent rows for the day, ordered per vehicle for dwell-pairing
   * (see `computeDwellMinutesByVehicle` in the service).
   */
  async activityEvents(dayStart: Date, dayEnd: Date): Promise<ActivityEventRow[]> {
    return this.prisma.gpsActivityEvent.findMany({
      where: { occurredAt: { gte: dayStart, lt: dayEnd } },
      select: { vehicleId: true, kind: true, occurredAt: true },
      orderBy: [{ vehicleId: 'asc' }, { occurredAt: 'asc' }],
    });
  }

  /**
   * Every corridor touched by a vehicle's trips today (dedup not needed — used
   * as an "on any of today's routes" adherence check). Same corridor precedence
   * as `tripRealizations`: the day's chosen corridor → the route's default.
   */
  async dailyCorridorsByVehicle(operationDate: Date): Promise<Map<string, TripCorridor[]>> {
    const trips = await this.prisma.trip.findMany({
      where: { operationDate },
      select: {
        haulAssignment: { select: { haul: { select: { vehicleId: true } } } },
        corridor: { select: { pathGeojson: true, toleranceMeters: true, deletedAt: true } },
        route: {
          select: {
            corridors: {
              where: { isDefault: true, deletedAt: null },
              select: { pathGeojson: true, toleranceMeters: true },
              take: 1,
            },
          },
        },
      },
    });
    const map = new Map<string, TripCorridor[]>();
    for (const t of trips) {
      const chosen = t.corridor && t.corridor.deletedAt == null ? t.corridor : null;
      const corridor = chosen ?? t.route?.corridors[0] ?? null;
      if (!corridor) continue;
      const vehicleId = t.haulAssignment.haul.vehicleId;
      const list = map.get(vehicleId) ?? [];
      list.push({ pathGeojson: corridor.pathGeojson, toleranceMeters: corridor.toleranceMeters });
      map.set(vehicleId, list);
    }
    return map;
  }

  /**
   * Adherence sample for one vehicle/day: how many of its GPS pings fall within
   * tolerance of ANY of today's corridors, out of the day's total pings. One
   * `ST_DWithin` query per distinct corridor (typically 1–3/vehicle/day) —
   * fine for the nightly rollup, not a per-ping hot path.
   */
  async pingAdherence(
    vehicleId: string,
    dayStart: Date,
    dayEnd: Date,
    corridors: readonly TripCorridor[],
  ): Promise<{ within: number; total: number }> {
    const total = await this.prisma.gpsPing.count({
      where: { vehicleId, recordedAt: { gte: dayStart, lt: dayEnd } },
    });
    if (total === 0 || corridors.length === 0) {
      return { within: 0, total };
    }
    const withinIds = new Set<string>();
    for (const c of corridors) {
      const json = JSON.stringify(c.pathGeojson);
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM gps_ping
        WHERE vehicle_id = ${vehicleId}
          AND recorded_at >= ${dayStart} AND recorded_at < ${dayEnd}
          AND ST_DWithin(
            ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326)::geography,
            ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography,
            ${c.toleranceMeters}
          )
      `;
      for (const r of rows) withinIds.add(r.id);
    }
    return { within: withinIds.size, total };
  }

  upsert(
    date: Date,
    vehicleId: string,
    metrics: Omit<Prisma.DailyVehicleEfficiencyCreateInput, 'date' | 'vehicleId'>,
  ): Promise<unknown> {
    return this.prisma.dailyVehicleEfficiency.upsert({
      where: { date_vehicleId: { date, vehicleId } },
      update: metrics,
      create: { date, vehicleId, ...metrics },
    });
  }

  /** Efficiency rows in a date range, with the vehicle plate (for the dashboard). */
  async efficiencyRows(from: Date, to: Date): Promise<EfficiencyRow[]> {
    const rows = await this.prisma.$queryRaw<EfficiencyRow[]>`
      SELECT e."date", e."vehicle_id" AS "vehicleId", v."plate_number" AS "plate",
             e."position_source" AS "positionSource", e."planned_meters" AS "plannedMeters",
             e."actual_meters" AS "actualMeters", e."adherence_pct" AS "adherencePct",
             e."dwell_minutes" AS "dwellMinutes", e."late_minutes" AS "lateMinutes",
             e."wasted_fuel_liters" AS "wastedFuelLiters", e."gpsid_fuel_liters" AS "gpsidFuelLiters",
             e."deviation_count" AS "deviationCount"
      FROM "daily_vehicle_efficiency" e
      JOIN "vehicle" v ON v."id" = e."vehicle_id"
      WHERE e."date" >= ${from}::date AND e."date" <= ${to}::date
      ORDER BY e."date" DESC, v."plate_number" ASC
    `;
    return rows;
  }

  /** Active hardware devices with an IMEI → vehicle, for the GPS.id mileage pull. */
  async activeDeviceImeis(): Promise<Array<{ imei: string; vehicleId: string }>> {
    const rows = await this.prisma.gpsDevice.findMany({
      where: { active: true, deviceType: 'gps-hardware', imei: { not: null } },
      select: { imei: true, vehicleId: true },
    });
    return rows.flatMap((r) => (r.imei ? [{ imei: r.imei, vehicleId: r.vehicleId }] : []));
  }

  /** Fill the nightly GPS.id mileage cross-check for one vehicle/day. */
  async updateGpsidFuel(date: Date, vehicleId: string, liters: number): Promise<void> {
    await this.prisma.dailyVehicleEfficiency.updateMany({
      where: { date, vehicleId },
      data: { gpsidFuelLiters: liters },
    });
  }

  /** Count active hardware devices by status (for the device-offline KPI). */
  async deviceStatusCounts(): Promise<{ online: number; offline: number }> {
    const rows = await this.prisma.gpsDevice.groupBy({
      by: ['status'],
      where: { active: true, deviceType: 'gps-hardware' },
      _count: { _all: true },
    });
    let online = 0;
    let offline = 0;
    for (const r of rows) {
      if (r.status === 'online') online = r._count._all;
      else offline += r._count._all;
    }
    return { online, offline };
  }
}

export interface EfficiencyRow {
  readonly date: Date;
  readonly vehicleId: string;
  readonly plate: string;
  readonly positionSource: string;
  readonly plannedMeters: number;
  readonly actualMeters: number;
  readonly adherencePct: Prisma.Decimal | null;
  readonly dwellMinutes: Prisma.Decimal | null;
  readonly lateMinutes: number;
  readonly wastedFuelLiters: Prisma.Decimal;
  readonly gpsidFuelLiters: Prisma.Decimal | null;
  readonly deviationCount: number;
}
