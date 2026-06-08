import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type WasteSource } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type CreateWasteSourceDto } from './dto/create-waste-source.dto';
import { type ListWasteSourcesQueryDto } from './dto/list-waste-sources.query.dto';
import { type UpdateWasteSourceDto } from './dto/update-waste-source.dto';
import { WasteSourcesRepository } from './waste-sources.repository';

export interface WasteSourceDto {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(source: WasteSource): WasteSourceDto {
  return {
    id: source.id,
    code: source.code,
    name: source.name,
    notes: source.notes,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

@Injectable()
export class WasteSourcesService {
  constructor(private readonly repo: WasteSourcesRepository) {}

  async list(
    query: ListWasteSourcesQueryDto,
  ): Promise<{ data: WasteSourceDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: number): Promise<WasteSourceDto> {
    const source = await this.repo.findById(id);
    if (!source) {
      throw new NotFoundException('Sumber sampah tidak ditemukan.');
    }
    return toDto(source);
  }

  async create(dto: CreateWasteSourceDto): Promise<WasteSourceDto> {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Kode sumber sampah sudah digunakan.');
    }
    const source = await this.repo.create({
      code: dto.code,
      name: dto.name,
      notes: dto.notes ?? null,
    });
    return toDto(source);
  }

  async update(id: number, dto: UpdateWasteSourceDto): Promise<WasteSourceDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Sumber sampah tidak ditemukan.');
    }
    if (dto.code && dto.code !== existing.code) {
      const taken = await this.repo.findByCode(dto.code);
      if (taken) {
        throw new ConflictException('Kode sumber sampah sudah digunakan.');
      }
    }
    const source = await this.repo.update(id, {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });
    return toDto(source);
  }

  async remove(id: number): Promise<{ message: string }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Sumber sampah tidak ditemukan.');
    }
    const links = await this.repo.countVehicleLinks(id);
    if (links > 0) {
      throw new ConflictException(`Tidak dapat menghapus: masih dipakai oleh ${links} kendaraan.`);
    }
    await this.repo.delete(id);
    return { message: 'Sumber sampah telah dihapus.' };
  }
}
