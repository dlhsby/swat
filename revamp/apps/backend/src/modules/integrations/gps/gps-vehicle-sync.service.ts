import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { extractPlate } from '../../../common/plate';

import { GpsDeviceRepository } from './gps-device.repository';
import { GpsidClientService } from './gpsid-client.service';

// Re-exported so existing importers (and the spec) keep resolving it here.
export { extractPlate };

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
  /** True when this device took over as the active tracker, deactivating a prior
   *  active hardware device on the vehicle (retained — the relation is 1:many). */
  readonly replacedPrior: boolean;
}

/** Outcome of a GPS.id → SWAT device roster sync. */
export interface GpsSyncResult {
  readonly createdCount: number;
  readonly remappedCount: number;
  readonly unchangedCount: number;
  /** GPS.id rows skipped because they carried no plate to match on. */
  readonly skippedNoPlateCount: number;
  /** Synced devices that took over as active tracker, deactivating a prior one. */
  readonly replacedActiveCount: number;
  /** Unmatched GPS.id vehicles newly parked in the "IMEI tak dikenal" queue. */
  readonly queuedUnknownCount: number;
  readonly created: SyncedDevice[];
  readonly remapped: SyncedDevice[];
  readonly unmatchedVehicles: UnmatchedVehicle[];
}

/**
 * GPS.id vehicle sync (Phase 7 / B4). Pulls the vendor's `/vehicle` roster and
 * reconciles it with the SWAT device registry **by plate number**:
 *   - unknown IMEI whose plate maps to a SWAT vehicle  → create a hardware device
 *   - known IMEI now on a different vehicle             → remap (re-link)
 *   - known IMEI already on the right vehicle           → unchanged
 *   - plate with no SWAT vehicle                        → reported (not linked)
 *
 * Additive + remap only — it never deletes SWAT devices. A vehicle may hold many
 * devices (1:many), so a synced device is LINKED and made the ACTIVE tracker; any
 * prior active hardware (e.g. a seeded demo tracker) is deactivated but retained,
 * keeping the one-active-hardware rule. Runs on demand (button) and, when enabled,
 * on a schedule.
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
    let replacedActiveCount = 0;

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
        // Remap to the plate's vehicle and make it the active tracker, deactivating
        // any other active hardware on that vehicle (retained — 1:many).
        const prior = await this.repo.findActiveHardwareForVehicle(vehicle.id);
        const replaced = prior !== null && prior.id !== existing.id;
        if (replaced) {
          await this.repo.deactivateDevice(prior.id);
          replacedActiveCount += 1;
        }
        await this.repo.update(existing.id, {
          vehicle: { connect: { id: vehicle.id } },
          active: true,
        });
        remapped.push({
          imei,
          plate: vehicle.plateNumber,
          vehicleId: vehicle.id,
          replacedPrior: replaced,
        });
      } else {
        // Add the real GPS.id device and make it active, deactivating any prior
        // active hardware (e.g. a seeded demo tracker) — the relation is 1:many.
        const prior = await this.repo.findActiveHardwareForVehicle(vehicle.id);
        if (prior) {
          await this.repo.deactivateDevice(prior.id);
          replacedActiveCount += 1;
        }
        await this.repo.create({
          vehicle: { connect: { id: vehicle.id } },
          deviceType: 'gps-hardware',
          deviceId: imei,
          imei,
          provider: 'gpsid',
          active: true,
        });
        created.push({
          imei,
          plate: vehicle.plateNumber,
          vehicleId: vehicle.id,
          replacedPrior: prior !== null,
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
      replacedActiveCount,
      queuedUnknownCount: toQueue.length,
      created,
      remapped,
      unmatchedVehicles,
    };
    this.logger.log(
      `GPS.id sync: +${result.createdCount} created, ${result.remappedCount} remapped, ` +
        `${result.unchangedCount} unchanged, ${result.replacedActiveCount} replaced, ` +
        `${result.unmatchedVehicles.length} unmatched (${result.queuedUnknownCount} newly queued).`,
    );
    return result;
  }
}
