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

  /** Today's trips per vehicle with planned distance (corridor length, else route km). */
  async tripRealizations(operationDate: Date): Promise<DailyTripRealization[]> {
    const trips = await this.prisma.trip.findMany({
      where: { operationDate },
      select: {
        targetTime: true,
        actualTime: true,
        actualOdometer: true,
        haulAssignment: { select: { haul: { select: { vehicleId: true } } } },
        route: {
          select: { distanceKm: true, geometry: { select: { lengthMeters: true } } },
        },
      },
    });
    return trips.map((t) => ({
      vehicleId: t.haulAssignment.haul.vehicleId,
      targetTime: t.targetTime,
      actualTime: t.actualTime,
      actualOdometer: t.actualOdometer,
      plannedMeters: t.route?.geometry?.lengthMeters ?? (t.route?.distanceKm ?? 0) * 1000,
    }));
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
