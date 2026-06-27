/**
 * Derived GPS-coverage badge for a vehicle (Phase 7). Mirrors the `GpsCoverage`
 * zod enum in `@swat/schemas` (consumed by the frontend); the backend keeps its
 * own copy — it does not depend on `@swat/schemas`. Shared here so both the GPS
 * device registry and the vehicle read DTO derive it by the exact same rule.
 */
export type GpsCoverage = 'tracked-online' | 'tracked-offline' | 'untracked';

/** A vehicle's GPS device, reduced to the fields coverage depends on. */
export interface CoverageDevice {
  readonly active: boolean;
  readonly deviceType: string;
  readonly status: string;
}

/**
 * Coverage from a vehicle's devices: `untracked` when there is no ACTIVE hardware
 * tracker (a valid state — not every vehicle has GPS); otherwise online/offline
 * from that device's maintained status. Non-hardware (e.g. future mobile) sources
 * don't drive the hardware-coverage badge.
 */
export function deriveGpsCoverage(devices: readonly CoverageDevice[] | undefined): GpsCoverage {
  const hardware = (devices ?? []).find((d) => d.active && d.deviceType === 'gps-hardware');
  if (!hardware) {
    return 'untracked';
  }
  return hardware.status === 'online' ? 'tracked-online' : 'tracked-offline';
}
