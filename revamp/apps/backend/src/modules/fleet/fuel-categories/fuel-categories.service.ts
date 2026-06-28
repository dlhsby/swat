import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type FuelCategory } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import {
  type CreateFuelCategoryDto,
  type ListFuelCategoriesQueryDto,
  type UpdateFuelCategoryDto,
} from './fuel-categories.dto';
import { FuelCategoriesRepository } from './fuel-categories.repository';

export interface FuelCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(row: FuelCategory): FuelCategoryDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class FuelCategoriesService {
  constructor(
    private readonly repo: FuelCategoriesRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(
    query: ListFuelCategoriesQueryDto,
  ): Promise<{ data: FuelCategoryDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toDto)), total, query);
  }

  async getById(id: string): Promise<FuelCategoryDto> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundException('Kategori bahan bakar tidak ditemukan.');
    }
    return toDto(row);
  }

  async create(dto: CreateFuelCategoryDto): Promise<FuelCategoryDto> {
    await this.assertNameAvailable(dto.name);
    return toDto(await this.repo.create({ name: dto.name }));
  }

  async update(id: string, dto: UpdateFuelCategoryDto): Promise<FuelCategoryDto> {
    await this.getById(id);
    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, id);
    }
    return toDto(
      await this.repo.update(id, { ...(dto.name !== undefined ? { name: dto.name } : {}) }),
    );
  }

  private async assertNameAvailable(name: string, exceptId?: string): Promise<void> {
    const existing = await this.repo.findByName(name);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Nama kategori bahan bakar sudah digunakan.');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);
    const fuels = await this.repo.countFuels(id);
    if (fuels > 0) {
      throw new ConflictException(
        `Tidak dapat menghapus: masih dipakai oleh ${fuels} bahan bakar.`,
      );
    }
    await this.repo.delete(id);
    return { message: 'Kategori bahan bakar telah dihapus.' };
  }
}
