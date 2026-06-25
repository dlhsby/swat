import { z } from 'zod';

/**
 * GPS device registry (Phase 7). The `Vehicle` master is never altered — the
 * GPS link lives in a separate device row, mapped by IMEI. `deviceType` is an
 * open string set (forward-compatible: a future `mobile-app` source plugs in
 * without a migration), but the form offers the two known kinds.
 */
export const GpsDeviceTypeEnum = z.enum(['gps-hardware', 'mobile-app']);
export type GpsDeviceType = z.infer<typeof GpsDeviceTypeEnum>;

/**
 * Derived GPS-coverage badge for a vehicle (computed server-side from the active
 * hardware device's status). `untracked` = no active hardware device at all.
 */
export const GpsCoverageEnum = z.enum(['tracked-online', 'tracked-offline', 'untracked']);
export type GpsCoverage = z.infer<typeof GpsCoverageEnum>;

const imei = z
  .string()
  .trim()
  .regex(/^[0-9]{6,20}$/, 'IMEI harus 6–20 digit angka');

export const GpsDeviceCreateSchema = z.object({
  vehicleId: z.uuid('Kendaraan wajib dipilih'),
  deviceType: GpsDeviceTypeEnum.default('gps-hardware'),
  // Device identifier — the IMEI for GPS.id hardware. Globally unique.
  deviceId: z.string().trim().min(1, 'ID perangkat wajib diisi').max(64),
  imei: imei.optional(),
  provider: z.string().trim().min(1).max(20).default('gpsid'),
  // Source preference: lower wins (hardware 0, phone 10). Default hardware.
  priority: z.coerce.number().int().min(0).max(100).default(0),
});
export type GpsDeviceCreateInput = z.infer<typeof GpsDeviceCreateSchema>;

export const GpsDeviceUpdateSchema = z
  .object({
    vehicleId: z.uuid(),
    deviceType: GpsDeviceTypeEnum,
    deviceId: z.string().trim().min(1).max(64),
    imei: imei.nullable(),
    provider: z.string().trim().min(1).max(20),
    priority: z.coerce.number().int().min(0).max(100),
    active: z.boolean(),
  })
  .partial();
export type GpsDeviceUpdateInput = z.infer<typeof GpsDeviceUpdateSchema>;

/** Map an unmatched IMEI from the queue to a vehicle (creates a hardware device). */
export const MapUnmatchedPingSchema = z.object({
  imei,
  vehicleId: z.uuid('Kendaraan wajib dipilih'),
});
export type MapUnmatchedPingInput = z.infer<typeof MapUnmatchedPingSchema>;
