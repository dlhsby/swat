import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import { type CreateFuelDto, type ListFuelsQueryDto, type UpdateFuelDto } from './fuels.dto';
import { FuelsRepository, type FuelWithCategory } from './fuels.repository';

export interface FuelDto {
  readonly id: string;
  readonly fuelCategoryId: string;
  readonly fuelCategoryName: string;
  readonly name: string;
  readonly pricePerLiter: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(fuel: FuelWithCategory): FuelDto {
  return {
    id: fuel.id,
    fuelCategoryId: fuel.fuelCategoryId,
    fuelCategoryName: fuel.fuelCategory.name,
    name: fuel.name,
    pricePerLiter: fuel.pricePerLiter,
    createdAt: fuel.createdAt.toISOString(),
    updatedAt: fuel.updatedAt.toISOString(),
  };
}

@Injectable()
export class FuelsService {
  constructor(
    private readonly repo: FuelsRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(query: ListFuelsQueryDto): Promise<{ data: FuelDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      fuelCategoryId: query.fuelCategoryId,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toDto)), total, query);
  }

  async getById(id: string): Promise<FuelDto> {
    const fuel = await this.repo.findById(id);
    if (!fuel) {
      throw new NotFoundException('Bahan bakar tidak ditemukan.');
    }
    return toDto(fuel);
  }

  async create(dto: CreateFuelDto): Promise<FuelDto> {
    await this.assertCategoryExists(dto.fuelCategoryId);
    await this.assertNameAvailable(dto.fuelCategoryId, dto.name);
    const fuel = await this.repo.create({
      name: dto.name,
      pricePerLiter: dto.pricePerLiter,
      fuelCategory: { connect: { id: dto.fuelCategoryId } },
    });
    return toDto(fuel);
  }

  async update(id: string, dto: UpdateFuelDto): Promise<FuelDto> {
    const current = await this.getById(id);
    if (dto.fuelCategoryId !== undefined) {
      await this.assertCategoryExists(dto.fuelCategoryId);
    }
    if (dto.name !== undefined || dto.fuelCategoryId !== undefined) {
      await this.assertNameAvailable(
        dto.fuelCategoryId ?? current.fuelCategoryId,
        dto.name ?? current.name,
        id,
      );
    }
    const fuel = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.pricePerLiter !== undefined ? { pricePerLiter: dto.pricePerLiter } : {}),
      ...(dto.fuelCategoryId !== undefined
        ? { fuelCategory: { connect: { id: dto.fuelCategoryId } } }
        : {}),
    });
    return toDto(fuel);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);
    const models = await this.repo.countModels(id);
    if (models > 0) {
      throw new ConflictException(`Tidak dapat menghapus: masih dipakai oleh ${models} model.`);
    }
    await this.repo.delete(id);
    return { message: 'Bahan bakar telah dihapus.' };
  }

  private async assertCategoryExists(id: string): Promise<void> {
    const category = await this.repo.categoryExists(id);
    if (!category) {
      throw new BadRequestException('Kategori bahan bakar tidak ditemukan.');
    }
  }

  private async assertNameAvailable(
    fuelCategoryId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.repo.findByNameInCategory(fuelCategoryId, name);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Nama bahan bakar sudah digunakan pada kategori ini.');
    }
  }
}
