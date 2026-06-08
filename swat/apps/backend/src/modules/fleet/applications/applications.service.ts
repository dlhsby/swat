import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type VehicleApplication } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  type CreateApplicationDto,
  type ListApplicationsQueryDto,
  type UpdateApplicationDto,
} from './applications.dto';
import { ApplicationsRepository } from './applications.repository';

export interface ApplicationDto {
  readonly id: number;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(row: VehicleApplication): ApplicationDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly repo: ApplicationsRepository) {}

  async list(
    query: ListApplicationsQueryDto,
  ): Promise<{ data: ApplicationDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: number): Promise<ApplicationDto> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundException('Aplikasi kendaraan tidak ditemukan.');
    }
    return toDto(row);
  }

  async create(dto: CreateApplicationDto): Promise<ApplicationDto> {
    await this.assertNameAvailable(dto.name);
    return toDto(await this.repo.create({ name: dto.name }));
  }

  async update(id: number, dto: UpdateApplicationDto): Promise<ApplicationDto> {
    await this.getById(id);
    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, id);
    }
    return toDto(
      await this.repo.update(id, { ...(dto.name !== undefined ? { name: dto.name } : {}) }),
    );
  }

  private async assertNameAvailable(name: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findByName(name);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Nama aplikasi kendaraan sudah digunakan.');
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.getById(id);
    const models = await this.repo.countModels(id);
    if (models > 0) {
      throw new ConflictException(`Tidak dapat menghapus: masih dipakai oleh ${models} model.`);
    }
    await this.repo.delete(id);
    return { message: 'Aplikasi kendaraan telah dihapus.' };
  }
}
