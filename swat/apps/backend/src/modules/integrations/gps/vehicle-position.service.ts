import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../config/config.service';

import {
  type RealizationLeg,
  VehiclePositionRepository,
  type VehicleWithDevice,
} from './vehicle-position.repository';

/** How a vehicle's position was determined (device presence chooses, not freshness). */
export type PositionSource = 'live-gps' | 'recorded-activity';

export interface VehiclePositionDto {
  readonly vehicleId: string;
  readonly plate: string;
  readonly source: PositionSource;
  /** Device online/offline for live-gps; null for recorded-activity. */
  readonly status: 'online' | 'offline' | null;
  readonly latitude: number;
  readonly longitude: number;
  /** Position timestamp: last ping (live) or the recorded actualTime (recorded). */
  readonly asOf: string;
  readonly speedKmh: number | null;
  readonly heading: number | null;
  /** Human label for a recorded-activity marker (e.g. "Menuju TPA Benowo"). */
  readonly legLabel: string | null;
}

export interface TrackPointDto {
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly heading: number | null;
  readonly recordedAt: string;
}

function num(value: { toNumber(): number } | null): number | null {
  return value === null ? null : value.toNumber();
}

function utcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Single position-resolution service (Phase 7, T-717). For the whole active fleet,
 * **device presence chooses the source**:
 *  - a vehicle WITH a hardware device → `live-gps`: its last fix, flagged
 *    online/offline by `GPS_DEVICE_OFFLINE_MINUTES`. A stale device keeps its
 *    last-known position (offline) — it never falls back to recorded activity.
 *  - a vehicle WITHOUT a device → `recorded-activity`: the destination Site of its
 *    latest realized leg today (or the next in-progress leg = "heading to").
 *  - no device + no fix + no activity → omitted (not plotted).
 */
@Injectable()
export class VehiclePositionService {
  constructor(
    private readonly repo: VehiclePositionRepository,
    private readonly config: AppConfigService,
  ) {}

  async fleetPositions(now: Date = new Date()): Promise<VehiclePositionDto[]> {
    const offlineMs = this.config.gps.deviceOfflineMinutes * 60_000;
    const vehicles = await this.repo.vehiclesWithDevice();
    const untrackedIds = vehicles.filter((v) => v.gpsDevices.length === 0).map((v) => v.id);
    const activity = await this.repo.recordedActivity(untrackedIds, utcMidnight(now));
    const legByVehicle = this.pickLegPerVehicle(activity);

    const positions: VehiclePositionDto[] = [];
    for (const vehicle of vehicles) {
      const dto = vehicle.gpsDevices[0]
        ? this.liveGps(vehicle, now, offlineMs)
        : this.recordedActivity(vehicle, legByVehicle.get(vehicle.id));
      if (dto) {
        positions.push(dto);
      }
    }
    return positions;
  }

  async track(
    vehicleId: string,
    minutes: number,
    now: Date = new Date(),
  ): Promise<TrackPointDto[]> {
    const since = new Date(now.getTime() - minutes * 60_000);
    const rows = await this.repo.recentTrack(vehicleId, since);
    return rows.map((p) => ({
      latitude: p.latitude.toNumber(),
      longitude: p.longitude.toNumber(),
      speedKmh: p.speedKmh.toNumber(),
      heading: p.heading,
      recordedAt: p.recordedAt.toISOString(),
    }));
  }

  private liveGps(
    vehicle: VehicleWithDevice,
    now: Date,
    offlineMs: number,
  ): VehiclePositionDto | null {
    const device = vehicle.gpsDevices[0];
    if (!device || device.lastLat === null || device.lastLng === null || !device.lastPingAt) {
      return null; // GPS vehicle with no fix today → not plotted.
    }
    const online = now.getTime() - device.lastPingAt.getTime() <= offlineMs;
    return {
      vehicleId: vehicle.id,
      plate: vehicle.plateNumber,
      source: 'live-gps',
      status: online ? 'online' : 'offline',
      latitude: device.lastLat.toNumber(),
      longitude: device.lastLng.toNumber(),
      asOf: device.lastPingAt.toISOString(),
      speedKmh: num(device.lastSpeedKmh),
      heading: device.lastHeading,
      legLabel: null,
    };
  }

  private recordedActivity(
    vehicle: VehicleWithDevice,
    leg: RealizationLeg | undefined,
  ): VehiclePositionDto | null {
    const site = leg?.route?.destinationSite;
    if (!leg || !site || site.latitude === null || site.longitude === null) {
      return null;
    }
    const realized = leg.actualTime !== null;
    const label = realized ? `${site.name} · tercatat` : `Menuju ${site.name}`;
    return {
      vehicleId: vehicle.id,
      plate: vehicle.plateNumber,
      source: 'recorded-activity',
      status: null,
      latitude: site.latitude.toNumber(),
      longitude: site.longitude.toNumber(),
      asOf: (leg.actualTime ?? leg.targetTime ?? new Date()).toISOString(),
      speedKmh: null,
      heading: null,
      legLabel: label,
    };
  }

  /**
   * Per vehicle, choose the latest REALIZED leg (has actualTime); if none, the
   * next in-progress leg ("heading to"). Input is ordered actualTime desc,
   * targetTime asc, so the first realized row per vehicle is the latest realized.
   */
  private pickLegPerVehicle(legs: RealizationLeg[]): Map<string, RealizationLeg> {
    const realized = new Map<string, RealizationLeg>();
    const heading = new Map<string, RealizationLeg>();
    for (const leg of legs) {
      const vehicleId = leg.haulAssignment.haul.vehicleId;
      if (leg.actualTime !== null) {
        if (!realized.has(vehicleId)) realized.set(vehicleId, leg);
      } else if (!heading.has(vehicleId)) {
        heading.set(vehicleId, leg);
      }
    }
    const chosen = new Map<string, RealizationLeg>(heading);
    for (const [vehicleId, leg] of realized) {
      chosen.set(vehicleId, leg); // realized wins over heading-to
    }
    return chosen;
  }
}
