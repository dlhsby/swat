import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PermitWithVehicleAndSite, WeighbridgeRepository } from './weighbridge.repository';
import { type ResolvedKitir } from './weighbridge.types';

/** Parse a `YYYY-MM-DD` string to a UTC-midnight Date for `@db.Date` comparison. */
export function parseIsoDate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Tanggal tidak valid');
  }
  return parsed;
}

function toResolvedKitir(permit: PermitWithVehicleAndSite): ResolvedKitir {
  const { vehicle, site } = permit;
  return {
    id: permit.id,
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    siteId: site.id,
    siteName: site.name,
    status: permit.status,
    validFrom: permit.validFrom.toISOString().slice(0, 10),
    validTo: permit.validTo.toISOString().slice(0, 10),
    vehicle: {
      brand: vehicle.model.brand,
      currentTareWeight: vehicle.currentTareWeight,
      normalTareWeight: vehicle.model.normalTareWeight,
      maxNetLoad: vehicle.model.maxNetLoad ?? 0,
      maxNetVolume: vehicle.model.maxNetVolume ?? 0,
    },
  };
}

/**
 * Resolves a kitir (DisposalPermit) to a vehicle's authorization + specs for the
 * weighbridge (Phase 4, T-404). Validates the permit is ACTIVE and within its
 * validity window, and that the vehicle is operational (GOOD). Throws
 * NotFound/BadRequest, mapped to 404/400 by the global filter.
 */
@Injectable()
export class WeighbridgeResolutionService {
  constructor(private readonly repo: WeighbridgeRepository) {}

  async resolveKitir(
    params: { code?: string; plateNumber?: string },
    date: string,
  ): Promise<ResolvedKitir> {
    if (!params.code && !params.plateNumber) {
      throw new BadRequestException('Harus menyediakan code atau plateNumber');
    }
    const when = parseIsoDate(date);
    const permit = params.code
      ? await this.repo.findActivePermitByCode(params.code, when)
      : await this.repo.findActivePermitByPlate(params.plateNumber as string, when);

    if (!permit) {
      throw new NotFoundException('Kitir tidak ditemukan atau sudah kadaluarsa');
    }
    if (permit.vehicle.status !== 'GOOD') {
      throw new NotFoundException('Kendaraan tidak dalam kondisi layak operasi');
    }
    return toResolvedKitir(permit);
  }

  /** Resolve by permit id for the post-weighing path; same active+window checks. */
  async requireActivePermitById(id: string, date: string): Promise<PermitWithVehicleAndSite> {
    return this.assertOperational(await this.repo.findActivePermitById(id, parseIsoDate(date)));
  }

  /** Resolve by plate (TPA-scoped) for the post-weighing path. */
  async requireActivePermitByPlate(
    plateNumber: string,
    date: string,
  ): Promise<PermitWithVehicleAndSite> {
    return this.assertOperational(
      await this.repo.findActivePermitByPlate(plateNumber, parseIsoDate(date)),
    );
  }

  private assertOperational(permit: PermitWithVehicleAndSite | null): PermitWithVehicleAndSite {
    if (!permit) {
      throw new NotFoundException('Kitir tidak valid');
    }
    if (permit.vehicle.status !== 'GOOD') {
      throw new NotFoundException('Kendaraan tidak dalam kondisi layak operasi');
    }
    return permit;
  }
}
