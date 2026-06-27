import { Injectable } from '@nestjs/common';

import { type EfficiencyRow, GpsEfficiencyRepository } from './gps-efficiency.repository';

export interface EfficiencyRowDto {
  readonly date: string;
  readonly vehicleId: string;
  readonly plate: string;
  readonly positionSource: string;
  readonly plannedMeters: number;
  readonly actualMeters: number;
  readonly adherencePct: number | null;
  readonly dwellMinutes: number | null;
  readonly lateMinutes: number;
  readonly wastedFuelLiters: number;
  readonly gpsidFuelLiters: number | null;
  readonly deviationCount: number;
}

export interface EfficiencyDashboardDto {
  readonly kpis: {
    /** Avg route adherence over TRACKED rows only (null when none measured yet). */
    readonly adherencePct: number | null;
    readonly wastedFuelLiters: number;
    readonly gpsidFuelLiters: number | null;
    readonly lateMinutes: number;
    readonly deviationCount: number;
    readonly distanceKm: number;
    /** Tracked rows ÷ all rows in range. */
    readonly gpsCoverageRate: number;
    readonly deviceOnline: number;
    readonly deviceOffline: number;
    readonly deviceOfflineRate: number;
  };
  readonly rows: EfficiencyRowDto[];
}

function n(value: { toNumber(): number } | null): number | null {
  return value === null ? null : value.toNumber();
}

function toRow(r: EfficiencyRow): EfficiencyRowDto {
  return {
    date: r.date.toISOString().slice(0, 10),
    vehicleId: r.vehicleId,
    plate: r.plate,
    positionSource: r.positionSource,
    plannedMeters: r.plannedMeters,
    actualMeters: r.actualMeters,
    adherencePct: n(r.adherencePct),
    dwellMinutes: n(r.dwellMinutes),
    lateMinutes: r.lateMinutes,
    wastedFuelLiters: r.wastedFuelLiters.toNumber(),
    gpsidFuelLiters: n(r.gpsidFuelLiters),
    deviationCount: r.deviationCount,
  };
}

/**
 * Efficiency dashboard read model (Phase 7, T-721). KPIs answer "where are
 * vehicles / on route? / time + fuel wasted / coverage + who's offline". Adherence
 * is scoped to TRACKED rows (its denominator); distance/fuel/lateness span the
 * whole fleet (tracked + untracked).
 */
@Injectable()
export class GpsEfficiencyReadService {
  constructor(private readonly repo: GpsEfficiencyRepository) {}

  async dashboard(from: Date, to: Date): Promise<EfficiencyDashboardDto> {
    const [rows, devices] = await Promise.all([
      this.repo.efficiencyRows(from, to),
      this.repo.deviceStatusCounts(),
    ]);

    const adherenceValues = rows
      .map((r) => n(r.adherencePct))
      .filter((v): v is number => v !== null);
    const tracked = rows.filter((r) => r.positionSource === 'gps').length;
    const totalDevices = devices.online + devices.offline;

    const sum = (pick: (r: EfficiencyRow) => number): number =>
      rows.reduce((s, r) => s + pick(r), 0);

    return {
      kpis: {
        adherencePct:
          adherenceValues.length > 0
            ? Number(
                (adherenceValues.reduce((s, v) => s + v, 0) / adherenceValues.length).toFixed(1),
              )
            : null,
        wastedFuelLiters: Number(sum((r) => r.wastedFuelLiters.toNumber()).toFixed(2)),
        gpsidFuelLiters: rows.some((r) => r.gpsidFuelLiters !== null)
          ? Number(sum((r) => n(r.gpsidFuelLiters) ?? 0).toFixed(2))
          : null,
        lateMinutes: sum((r) => r.lateMinutes),
        deviationCount: sum((r) => r.deviationCount),
        distanceKm: Number((sum((r) => r.actualMeters) / 1000).toFixed(1)),
        gpsCoverageRate: rows.length > 0 ? Number((tracked / rows.length).toFixed(3)) : 0,
        deviceOnline: devices.online,
        deviceOffline: devices.offline,
        deviceOfflineRate:
          totalDevices > 0 ? Number((devices.offline / totalDevices).toFixed(3)) : 0,
      },
      rows: rows.map(toRow),
    };
  }
}
