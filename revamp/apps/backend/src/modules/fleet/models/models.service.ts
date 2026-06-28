import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import {
  type CreateVehicleModelDto,
  type ListVehicleModelsQueryDto,
  type UpdateVehicleModelDto,
} from './models.dto';
import { VehicleModelsRepository, type VehicleModelWithRefs } from './models.repository';

export interface VehicleModelDto {
  readonly id: string;
  readonly vehicleTypeId: string;
  readonly vehicleTypeName: string;
  readonly fuelId: string;
  readonly fuelName: string;
  readonly brand: string;
  readonly fuelTankCapacity: number;
  readonly normalFuelRatio: number;
  readonly normalTareWeight: number;
  readonly maxNetLoad: number | null;
  readonly maxNetVolume: number | null;
  readonly wheelCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(model: VehicleModelWithRefs): VehicleModelDto {
  return {
    id: model.id,
    vehicleTypeId: model.vehicleTypeId,
    vehicleTypeName: model.vehicleType.name,
    fuelId: model.fuelId,
    fuelName: model.fuel.name,
    brand: model.brand,
    fuelTankCapacity: model.fuelTankCapacity,
    normalFuelRatio: model.normalFuelRatio,
    normalTareWeight: model.normalTareWeight,
    maxNetLoad: model.maxNetLoad,
    maxNetVolume: model.maxNetVolume,
    wheelCount: model.wheelCount,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

@Injectable()
export class VehicleModelsService {
  constructor(
    private readonly repo: VehicleModelsRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(
    query: ListVehicleModelsQueryDto,
  ): Promise<{ data: VehicleModelDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleTypeId: query.vehicleTypeId,
      fuelId: query.fuelId,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toDto)), total, query);
  }

  async getById(id: string): Promise<VehicleModelDto> {
    const model = await this.repo.findById(id);
    if (!model) {
      throw new NotFoundException('Model kendaraan tidak ditemukan.');
    }
    return toDto(model);
  }

  async create(dto: CreateVehicleModelDto): Promise<VehicleModelDto> {
    await this.assertRefsExist(dto.vehicleTypeId, dto.fuelId);
    const model = await this.repo.create({
      brand: dto.brand,
      fuelTankCapacity: dto.fuelTankCapacity,
      normalTareWeight: dto.normalTareWeight,
      wheelCount: dto.wheelCount,
      ...(dto.normalFuelRatio !== undefined ? { normalFuelRatio: dto.normalFuelRatio } : {}),
      ...(dto.maxNetLoad !== undefined ? { maxNetLoad: dto.maxNetLoad } : {}),
      ...(dto.maxNetVolume !== undefined ? { maxNetVolume: dto.maxNetVolume } : {}),
      vehicleType: { connect: { id: dto.vehicleTypeId } },
      fuel: { connect: { id: dto.fuelId } },
    });
    return toDto(model);
  }

  async update(id: string, dto: UpdateVehicleModelDto): Promise<VehicleModelDto> {
    await this.getById(id);
    if (dto.vehicleTypeId !== undefined || dto.fuelId !== undefined) {
      await this.assertRefsExist(dto.vehicleTypeId, dto.fuelId);
    }
    const model = await this.repo.update(id, {
      ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
      ...(dto.fuelTankCapacity !== undefined ? { fuelTankCapacity: dto.fuelTankCapacity } : {}),
      ...(dto.normalFuelRatio !== undefined ? { normalFuelRatio: dto.normalFuelRatio } : {}),
      ...(dto.normalTareWeight !== undefined ? { normalTareWeight: dto.normalTareWeight } : {}),
      ...(dto.maxNetLoad !== undefined ? { maxNetLoad: dto.maxNetLoad } : {}),
      ...(dto.maxNetVolume !== undefined ? { maxNetVolume: dto.maxNetVolume } : {}),
      ...(dto.vehicleTypeId !== undefined
        ? { vehicleType: { connect: { id: dto.vehicleTypeId } } }
        : {}),
      ...(dto.fuelId !== undefined ? { fuel: { connect: { id: dto.fuelId } } } : {}),
    });
    return toDto(model);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);
    const vehicles = await this.repo.countVehicles(id);
    if (vehicles > 0) {
      throw new ConflictException(
        `Tidak dapat menghapus: masih dipakai oleh ${vehicles} kendaraan.`,
      );
    }
    await this.repo.delete(id);
    return { message: 'Model kendaraan telah dihapus.' };
  }

  private async assertRefsExist(vehicleTypeId?: string, fuelId?: string): Promise<void> {
    if (vehicleTypeId !== undefined) {
      const vehicleType = await this.repo.vehicleTypeExists(vehicleTypeId);
      if (!vehicleType) {
        throw new BadRequestException('Aplikasi kendaraan tidak ditemukan.');
      }
    }
    if (fuelId !== undefined) {
      const fuel = await this.repo.fuelExists(fuelId);
      if (!fuel) {
        throw new BadRequestException('Bahan bakar tidak ditemukan.');
      }
    }
  }
}
