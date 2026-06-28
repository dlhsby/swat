import { apiClient } from './api-client';
import { makeResourceApi } from './resource-api';

export type GpsDeviceType = 'gps-hardware' | 'mobile-app';
export type GpsDeviceStatus = 'online' | 'offline';

/**
 * A GPS device bound to a vehicle (Phase 7). The registry IS the "tracked" flag —
 * a vehicle is tracked by owning a row here; `deviceId`/`imei` is the GPS.id
 * `VehicleId` mapping.
 */
export interface GpsDeviceDto {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  deviceType: GpsDeviceType;
  deviceId: string;
  imei: string | null;
  provider: string;
  priority: number;
  active: boolean;
  status: GpsDeviceStatus;
  lastPingAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeedKmh: number | null;
  lastHeading: number | null;
  createdAt: string;
  updatedAt: string;
}

/** An IMEI seen on the wire with no registered device — queued, never dropped. */
export interface UnmatchedPingDto {
  imei: string;
  count: number;
  lastReceivedAt: string;
}

export const gpsDevicesApi = makeResourceApi<GpsDeviceDto>('/gps/devices');

/** Devices for a single vehicle (the per-vehicle "Perangkat GPS" section). */
export function listVehicleDevices(vehicleId: string): Promise<GpsDeviceDto[]> {
  return gpsDevicesApi.list(`?vehicleId=${encodeURIComponent(vehicleId)}`);
}

/** The unmatched-IMEI queue. */
export function listUnmatchedPings(): Promise<UnmatchedPingDto[]> {
  return apiClient.get<UnmatchedPingDto[]>('/gps/devices/unmatched');
}

/** One-click map: create a hardware device from a queued IMEI and clear its pings. */
export function mapUnmatchedPing(body: {
  imei: string;
  vehicleId: string;
}): Promise<GpsDeviceDto> {
  return apiClient.post<GpsDeviceDto>('/gps/devices/unmatched/map', body);
}
