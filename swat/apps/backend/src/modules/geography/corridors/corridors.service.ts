import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { type Prisma, type RouteCategory } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { assertLineString, InvalidGeometryError } from '../../integrations/gps/geojson';

import { type CorridorWithSites, CorridorsRepository } from './corridors.repository';
import { type CreateCorridorDto } from './dto/create-corridor.dto';
import { type ListCorridorsQueryDto } from './dto/list-corridors.query.dto';
import { type UpdateCorridorDto } from './dto/update-corridor.dto';

export interface CorridorDto {
  readonly id: string;
  readonly name: string;
  readonly category: RouteCategory | null;
  readonly originSiteId: string | null;
  readonly originSiteName: string | null;
  readonly destinationSiteId: string | null;
  readonly destinationSiteName: string | null;
  readonly pathGeojson: unknown;
  readonly waypoints: unknown | null;
  readonly toleranceMeters: number;
  readonly lengthMeters: number;
  readonly source: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(c: CorridorWithSites): CorridorDto {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    originSiteId: c.originSiteId,
    originSiteName: c.originSite?.name ?? null,
    destinationSiteId: c.destinationSiteId,
    destinationSiteName: c.destinationSite?.name ?? null,
    pathGeojson: c.pathGeojson,
    waypoints: c.waypoints ?? null,
    toleranceMeters: c.toleranceMeters,
    lengthMeters: c.lengthMeters,
    source: c.source,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

@Injectable()
export class CorridorsService {
  constructor(private readonly repo: CorridorsRepository) {}

  async list(query: ListCorridorsQueryDto): Promise<{ data: CorridorDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      category: query.category,
      originSiteId: query.originSiteId,
      destinationSiteId: query.destinationSiteId,
      search: query.search,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<CorridorDto> {
    const corridor = await this.repo.findById(id);
    if (!corridor) {
      throw new NotFoundException('Koridor tidak ditemukan.');
    }
    return toDto(corridor);
  }

  async create(dto: CreateCorridorDto): Promise<CorridorDto> {
    const line = this.validateGeometry(dto.pathGeojson);
    const lengthMeters = await this.lengthOrThrow(line);
    const corridor = await this.repo.create({
      name: dto.name.trim(),
      pathGeojson: line as unknown as Prisma.InputJsonValue,
      waypoints: (dto.waypoints ?? null) as Prisma.InputJsonValue | null,
      toleranceMeters: dto.toleranceMeters ?? 150,
      lengthMeters,
      source: dto.source ?? 'google-maps',
      category: dto.category ?? null,
      originSiteId: dto.originSiteId ?? null,
      destinationSiteId: dto.destinationSiteId ?? null,
    });
    return toDto(corridor);
  }

  async update(id: string, dto: UpdateCorridorDto): Promise<CorridorDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Koridor tidak ditemukan.');
    }
    // Recompute length only when the path changes.
    let lengthMeters: number | undefined;
    let pathGeojson: Prisma.InputJsonValue | undefined;
    if (dto.pathGeojson !== undefined) {
      const line = this.validateGeometry(dto.pathGeojson);
      lengthMeters = await this.lengthOrThrow(line);
      pathGeojson = line as unknown as Prisma.InputJsonValue;
    }
    const corridor = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(pathGeojson !== undefined ? { pathGeojson } : {}),
      ...(lengthMeters !== undefined ? { lengthMeters } : {}),
      ...(dto.waypoints !== undefined
        ? { waypoints: (dto.waypoints ?? null) as Prisma.InputJsonValue | null }
        : {}),
      ...(dto.toleranceMeters !== undefined ? { toleranceMeters: dto.toleranceMeters } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.originSiteId !== undefined ? { originSiteId: dto.originSiteId } : {}),
      ...(dto.destinationSiteId !== undefined ? { destinationSiteId: dto.destinationSiteId } : {}),
    });
    return toDto(corridor);
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new NotFoundException('Koridor tidak ditemukan.');
    }
    return { message: 'Koridor telah dihapus.' };
  }

  private validateGeometry(geojson: unknown): ReturnType<typeof assertLineString> {
    try {
      return assertLineString(geojson);
    } catch (err) {
      if (err instanceof InvalidGeometryError) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }

  /** Compute corridor length; a geometry PostGIS rejects → 422. */
  private async lengthOrThrow(line: unknown): Promise<number> {
    try {
      return await this.repo.computeLengthMeters(line);
    } catch {
      throw new UnprocessableEntityException('Geometri koridor tidak valid.');
    }
  }
}
