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
  /** Unmatched GPS.id vehicles newly parked in the "IMEI tak dikenal" queue. */
  readonly queuedUnknownCount: number;
  readonly created: SyncedDevice[];
  readonly remapped: SyncedDevice[];
  readonly unmatchedVehicles: UnmatchedVehicle[];
}

/** Indonesian plate: 1–2 area letters · 1–4 digits · 1–3 series letters. */
const PLATE_PATTERN = /([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{1,3})/g;

/**
 * Extract a normalized Indonesian license plate from a raw string.
 *
 * GPS.id names a vehicle by type + plate (e.g. `"ARMROLL 14M3-B 9552 EQ"`), and a
 * legacy SWAT plate may carry a dedup suffix (`"B9552EQ#43"`); both must reduce to
 * `"B9552EQ"` to match. Returns the LAST plate-shaped token (the vendor puts the
 * plate last, after the body type/size), or a punctuation-stripped fallback when no
 * plate shape is found. Applied to BOTH sides so the comparison is symmetric.
 */
export function extractPlate(raw: string): string {
  const upper = raw.toUpperCase();
  PLATE_PATTERN.lastIndex = 0;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = PLATE_PATTERN.exec(upper)) !== null) {
    last = match;
  }
  if (last) {
    return `${last[1]}${last[2]}${last[3]}`;
  }
  return upper.replace(/[^A-Z0-9]/g, '');
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
    const byPlate = new Map(vehicles.map((v) => [extractPlate(v.plateNumber), v]));
    // Preloaded once so the (many) unmatched rows don't each hit the DB.
    const knownDeviceIds = new Set(await this.repo.listDeviceIds());
    const queuedImeis = new Set(await this.repo.listQueuedImeis());

    const created: SyncedDevice[] = [];
    const remapped: SyncedDevice[] = [];
    const unmatchedVehicles: UnmatchedVehicle[] = [];
    // Unknown GPS.id vehicles to park in the "IMEI tak dikenal" queue (bulk-inserted).
    const toQueue: Array<{ imei: string; payload: Record<string, string> }> = [];
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
      const vehicle = byPlate.get(extractPlate(row.plate));
      if (!vehicle) {
        unmatchedVehicles.push({ imei, plate: row.plate });
        // Surface it into the unmatched-IMEI queue for manual mapping, unless the IMEI
        // is already a registered device or already parked in the queue.
        if (!knownDeviceIds.has(imei) && !queuedImeis.has(imei)) {
          queuedImeis.add(imei);
          toQueue.push({ imei, payload: { VehicleNumber: row.plate, source: 'gpsid-roster' } });
        }
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

    if (toQueue.length > 0) {
      await this.repo.addUnmatchedPings(toQueue);
    }

    const result: GpsSyncResult = {
      createdCount: created.length,
      remappedCount: remapped.length,
      unchangedCount,
      skippedNoPlateCount,
      conflictCount,
      queuedUnknownCount: toQueue.length,
      created,
      remapped,
      unmatchedVehicles,
    };
    this.logger.log(
      `GPS.id sync: +${result.createdCount} created, ${result.remappedCount} remapped, ` +
        `${result.unchangedCount} unchanged, ${result.conflictCount} conflicts, ` +
        `${result.unmatchedVehicles.length} unmatched (${result.queuedUnknownCount} newly queued).`,
    );
    return result;
  }
}
