import { Injectable, NotFoundException } from '@nestjs/common';
import { type Levy } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../common/dates';
import { paginated } from '../../common/pagination';
import { type PaginationMeta } from '../../common/types/api-response';

import { type CreateLevyDto } from './dto/create-levy.dto';
import { type ListLevyQueryDto } from './dto/list-levy.query.dto';
import { type UpdateLevyDto } from './dto/update-levy.dto';
import { LevyRepository } from './levy.repository';

export interface LevyDto {
  readonly id: string;
  readonly categoryName: string;
  readonly date: string;
  readonly amount: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map a Levy row to its API DTO. `amount` is integer IDR (BigInt → number). */
function toDto(levy: Levy): LevyDto {
  return {
    id: levy.id,
    categoryName: levy.categoryName,
    date: formatDateOnly(levy.date),
    amount: Number(levy.amount),
    notes: levy.notes,
    createdAt: levy.createdAt.toISOString(),
    updatedAt: levy.updatedAt.toISOString(),
  };
}

@Injectable()
export class LevyService {
  constructor(private readonly repo: LevyRepository) {}

  async list(query: ListLevyQueryDto): Promise<{ data: LevyDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      categoryName: query.categoryName,
      dateFrom: query.dateFrom ? parseDateOnly(query.dateFrom) : undefined,
      dateTo: query.dateTo ? parseDateOnly(query.dateTo) : undefined,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<LevyDto> {
    const levy = await this.repo.findById(id);
    if (!levy) {
      throw new NotFoundException('Retribusi tidak ditemukan.');
    }
    return toDto(levy);
  }

  async create(dto: CreateLevyDto): Promise<LevyDto> {
    // Scalar fields only (unchecked input): the audit middleware stamps the scalar
    // createdById/updatedById, which a relation-style (checked) createdBy connect
    // would reject because Levy declares createdBy/updatedBy relations.
    const levy = await this.repo.create({
      categoryName: dto.categoryName,
      date: parseDateOnly(dto.date),
      amount: BigInt(dto.amount),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });
    return toDto(levy);
  }

  async update(id: string, dto: UpdateLevyDto): Promise<LevyDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Retribusi tidak ditemukan.');
    }
    const levy = await this.repo.update(id, {
      ...(dto.categoryName !== undefined ? { categoryName: dto.categoryName } : {}),
      ...(dto.date !== undefined ? { date: parseDateOnly(dto.date) } : {}),
      ...(dto.amount !== undefined ? { amount: BigInt(dto.amount) } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      // updatedById is stamped by the audit middleware.
    });
    return toDto(levy);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Retribusi tidak ditemukan.');
    }
    await this.repo.remove(id);
  }
}
