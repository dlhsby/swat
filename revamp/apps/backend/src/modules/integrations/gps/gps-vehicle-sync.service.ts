import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { GpsDeviceRepository } from './gps-device.repository';
import { GpsidClientService } from './gpsid-client.service';

/** One GPS.id vehicle that could not be linked (its plate has no SWAT vehicle). */
export interface UnmatchedVehicle {
  readonly imei: string;
  readonly plate: string;
}

/** A device linked to a vehicle by the sync (created or remapped). */
export interface SyncedDevice {
  readonly imei: string;
  readonly plate: string;
  readonly vehicleId: string;
  /** True when the vehicle already had another active hardware tracker, so this
   *  device was linked as INACTIVE to preserve the one-active-hardware rule. */
  readonly inactiveDueToConflict: boolean;
}

/** Outcome of a GPS.id → SWAT device roster sync. */
export interface GpsSyncResult {
  readonly createdCount: number;
  readonly remappedCount: number;
  readonly unchangedCount: number;
  /** GPS.id rows skipped because they carried no plate to match on. */
  readonly skippedNoPlateCount: number;
  /** Devices linked as inactive because the vehicle had active hardware already. */
  readonly conflictCount: number;
  readonly created: SyncedDevice[];
  readonly remapped: SyncedDevice[];
  readonly unmatchedVehicles: UnmatchedVehicle[];
}

/** Normalize a plate for matching: drop all whitespace, upper-case. */
export function normalizePlate(plate: string): string {
  return plate.replace(/\s+/g, '').toUpperCase();
}

/**
 * GPS.id vehicle sync (Phase 7 / B4). Pulls the vendor's `/vehicle` roster and
 * reconciles it with the SWAT device registry **by plate number**:
 *   - unknown IMEI whose plate maps to a SWAT vehicle  → create a hardware device
 *   - known IMEI now on a different vehicle             → remap (re-link)
 *   - known IMEI already on the right vehicle           → unchanged
 *   - plate with no SWAT vehicle                        → reported (not linked)
 *
 * Additive + remap only — it never deletes SWAT devices. The one-active-hardware
 * rule is preserved: a device that would become a second active tracker on a
 * vehicle is linked INACTIVE and reported as a conflict for the operator to
 * resolve. Runs on demand (button) and, when enabled, on a schedule.
 */
@Injectable()
export class GpsVehicleSyncService {
  private readonly logger = new Logger(GpsVehicleSyncService.name);

  constructor(
    private readonly repo: GpsDeviceRepository,
    private readonly gpsid: GpsidClientService,
  ) {}

  async sync(): Promise<GpsSyncResult> {
    if (!this.gpsid.isConfigured) {
      throw new BadRequestException(
        'Integrasi GPS.id belum dikonfigurasi (kredensial pull tidak lengkap).',
      );
    }

    const remote = await this.gpsid.getVehicles();
    const vehicles = await this.repo.listVehiclePlates();
    const byPlate = new Map(vehicles.map((v) => [normalizePlate(v.plateNumber), v]));

    const created: SyncedDevice[] = [];
    const remapped: SyncedDevice[] = [];
    const unmatchedVehicles: UnmatchedVehicle[] = [];
    let unchangedCount = 0;
    let skippedNoPlateCount = 0;
    let conflictCount = 0;

    for (const row of remote) {
      const imei = row.imei.trim();
      if (!imei) {
        continue; // no device id → nothing to register
      }
      if (!row.plate || !row.plate.trim()) {
        skippedNoPlateCount += 1;
        continue;
      }
      const vehicle = byPlate.get(normalizePlate(row.plate));
      if (!vehicle) {
        unmatchedVehicles.push({ imei, plate: row.plate });
        continue;
      }

      const existing = await this.repo.findDeviceForSync(imei);
      if (existing) {
        if (existing.vehicleId === vehicle.id) {
          unchangedCount += 1;
          continue;
        }
        // Remap to the plate's vehicle. Preserve the one-active-hardware rule: if the
        // target already has an active hardware tracker, land this one inactive.
        const conflict =
          existing.active &&
          existing.deviceType === 'gps-hardware' &&
          (await this.repo.findActiveHardwareForVehicle(vehicle.id)) !== null;
        await this.repo.update(existing.id, {
          vehicle: { connect: { id: vehicle.id } },
          ...(conflict ? { active: false } : {}),
        });
        if (conflict) conflictCount += 1;
        remapped.push({
          imei,
          plate: vehicle.plateNumber,
          vehicleId: vehicle.id,
          inactiveDueToConflict: conflict,
        });
      } else {
        const conflict = (await this.repo.findActiveHardwareForVehicle(vehicle.id)) !== null;
        await this.repo.create({
          vehicle: { connect: { id: vehicle.id } },
          deviceType: 'gps-hardware',
          deviceId: imei,
          imei,
          provider: 'gpsid',
          active: !conflict,
        });
        if (conflict) conflictCount += 1;
        created.push({
          imei,
          plate: vehicle.plateNumber,
          vehicleId: vehicle.id,
          inactiveDueToConflict: conflict,
        });
      }
      // A freshly linked IMEI no longer belongs in the unmatched-ping queue.
      await this.repo.deleteUnmatchedForImei(imei);
    }

    const result: GpsSyncResult = {
      createdCount: created.length,
      remappedCount: remapped.length,
      unchangedCount,
      skippedNoPlateCount,
      conflictCount,
      created,
      remapped,
      unmatchedVehicles,
    };
    this.logger.log(
      `GPS.id sync: +${result.createdCount} created, ${result.remappedCount} remapped, ` +
        `${result.unchangedCount} unchanged, ${result.conflictCount} conflicts, ` +
        `${result.unmatchedVehicles.length} unmatched vehicles.`,
    );
    return result;
  }
}
