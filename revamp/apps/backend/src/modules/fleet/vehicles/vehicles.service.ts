import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type VehicleStatus } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { deriveGpsCoverage, type GpsCoverage } from '../../../common/gps-coverage';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import { type CreateVehicleDto } from './dto/create-vehicle.dto';
import { type ListVehiclesQueryDto } from './dto/list-vehicles.query.dto';
import { type UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesRepository, type VehicleWithRefs } from './vehicles.repository';

export interface VehicleDto {
  readonly id: string;
  readonly plateNumber: string;
  readonly status: VehicleStatus;
  readonly poolSiteId: string;
  readonly poolSiteName: string;
  readonly modelId: string;
  readonly modelBrand: string;
  /** Vehicle type name (legacy "aplikasi kendaraan") via the model. */
  readonly vehicleTypeName: string;
  /** Fuel name (legacy "bahan bakar") via the model. */
  readonly fuelTypeName: string;
  readonly chassisNumber: string;
  readonly engineNumber: string;
  readonly manufactureYear: number | null;
  readonly currentFuelRatio: number;
  readonly currentTareWeight: number;
  readonly currentOdometer: number;
  readonly registrationExpiry: string;
  readonly taxExpiry: string;
  readonly notes: string | null;
  /** Codes of the waste sources this vehicle serves (e.g. `['D']` = Dinas). */
  readonly wasteSourceCodes: string[];
  /** Derived GPS-coverage badge (Phase 7): tracked online/offline, or untracked. */
  readonly gpsCoverage: GpsCoverage;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Today as `YYYY-MM-DD` (UTC), for date-only comparisons against `@db.Date` inputs. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDto(vehicle: VehicleWithRefs): VehicleDto {
  return {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    status: vehicle.status,
    poolSiteId: vehicle.poolSiteId,
    poolSiteName: vehicle.poolSite.name,
    modelId: vehicle.modelId,
    modelBrand: vehicle.model.brand,
    vehicleTypeName: vehicle.model.vehicleType.name,
    fuelTypeName: vehicle.model.fuel.name,
    chassisNumber: vehicle.chassisNumber,
    engineNumber: vehicle.engineNumber,
    manufactureYear: vehicle.manufactureYear,
    currentFuelRatio: vehicle.currentFuelRatio,
    currentTareWeight: vehicle.currentTareWeight,
    currentOdometer: vehicle.currentOdometer,
    registrationExpiry: formatDateOnly(vehicle.registrationExpiry),
    taxExpiry: formatDateOnly(vehicle.taxExpiry),
    notes: vehicle.notes,
    wasteSourceCodes: vehicle.wasteSources.map((link) => link.wasteSource.code),
    gpsCoverage: deriveGpsCoverage(vehicle.gpsDevices),
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

@Injectable()
export class VehiclesService {
  constructor(
    private readonly repo: VehiclesRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(query: ListVehiclesQueryDto): Promise<{ data: VehicleDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      status: query.status,
      poolSiteId: query.poolSiteId,
      modelId: query.modelId,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toDto)), total, query);
  }

  async getById(id: string): Promise<VehicleDto> {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan.');
    }
    return toDto(vehicle);
  }

  async create(dto: CreateVehicleDto): Promise<VehicleDto> {
    // New vehicles must have a registration that is still valid (spec T-112).
    if (dto.registrationExpiry < todayIso()) {
      throw new BadRequestException('Masa berlaku STNK sudah lewat.');
    }
    await this.assertRefsExist(dto.modelId, dto.poolSiteId);
    const duplicate = await this.repo.findByPlate(dto.plateNumber);
    if (duplicate) {
      throw new ConflictException('Nomor polisi sudah terdaftar.');
    }

    const vehicle = await this.repo.create({
      plateNumber: dto.plateNumber,
      chassisNumber: dto.chassisNumber,
      engineNumber: dto.engineNumber,
      currentTareWeight: dto.currentTareWeight,
      currentOdometer: dto.currentOdometer,
      registrationExpiry: parseDateOnly(dto.registrationExpiry),
      taxExpiry: parseDateOnly(dto.taxExpiry),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.manufactureYear !== undefined ? { manufactureYear: dto.manufactureYear } : {}),
      ...(dto.currentFuelRatio !== undefined ? { currentFuelRatio: dto.currentFuelRatio } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      model: { connect: { id: dto.modelId } },
      poolSite: { connect: { id: dto.poolSiteId } },
    });
    return toDto(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Kendaraan tidak ditemukan.');
    }
    if (dto.modelId !== undefined || dto.poolSiteId !== undefined) {
      await this.assertRefsExist(dto.modelId, dto.poolSiteId);
    }
    if (dto.plateNumber !== undefined && dto.plateNumber !== existing.plateNumber) {
      const duplicate = await this.repo.findByPlate(dto.plateNumber);
      if (duplicate) {
        throw new ConflictException('Nomor polisi sudah terdaftar.');
      }
    }
    // Odometer is monotonic — never roll back the recorded distance.
    if (dto.currentOdometer !== undefined && dto.currentOdometer < existing.currentOdometer) {
      throw new BadRequestException('Odometer tidak boleh lebih kecil dari nilai saat ini.');
    }

    const vehicle = await this.repo.update(id, {
      ...(dto.plateNumber !== undefined ? { plateNumber: dto.plateNumber } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.chassisNumber !== undefined ? { chassisNumber: dto.chassisNumber } : {}),
      ...(dto.engineNumber !== undefined ? { engineNumber: dto.engineNumber } : {}),
      ...(dto.manufactureYear !== undefined ? { manufactureYear: dto.manufactureYear } : {}),
      ...(dto.currentFuelRatio !== undefined ? { currentFuelRatio: dto.currentFuelRatio } : {}),
      ...(dto.currentTareWeight !== undefined ? { currentTareWeight: dto.currentTareWeight } : {}),
      ...(dto.currentOdometer !== undefined ? { currentOdometer: dto.currentOdometer } : {}),
      ...(dto.registrationExpiry !== undefined
        ? { registrationExpiry: parseDateOnly(dto.registrationExpiry) }
        : {}),
      ...(dto.taxExpiry !== undefined ? { taxExpiry: parseDateOnly(dto.taxExpiry) } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.modelId !== undefined ? { model: { connect: { id: dto.modelId } } } : {}),
      ...(dto.poolSiteId !== undefined ? { poolSite: { connect: { id: dto.poolSiteId } } } : {}),
    });
    return toDto(vehicle);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);
    await this.repo.softDelete(id);
    return { message: 'Kendaraan telah dihapus.' };
  }

  private async assertRefsExist(modelId?: string, poolSiteId?: string): Promise<void> {
    if (modelId !== undefined) {
      const model = await this.repo.modelExists(modelId);
      if (!model) {
        throw new BadRequestException('Model kendaraan tidak ditemukan.');
      }
    }
    if (poolSiteId !== undefined) {
      const site = await this.repo.siteExists(poolSiteId);
      if (!site) {
        throw new BadRequestException('Pool tidak ditemukan.');
      }
    }
  }
}
