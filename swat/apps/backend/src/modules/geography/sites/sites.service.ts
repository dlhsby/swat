import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Site } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import { type CreateSiteDto } from './dto/create-site.dto';
import { type ListSitesQueryDto } from './dto/list-sites.query.dto';
import { type UpdateSiteDto } from './dto/update-site.dto';
import { SitesRepository } from './sites.repository';

export interface SiteDto {
  readonly id: string;
  readonly type: Site['type'];
  readonly name: string;
  readonly address: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toSiteDto(site: Site): SiteDto {
  return {
    id: site.id,
    type: site.type,
    name: site.name,
    address: site.address,
    latitude: site.latitude === null ? null : Number(site.latitude),
    longitude: site.longitude === null ? null : Number(site.longitude),
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

/** Coordinates are both-or-neither: a partial pair is meaningless on a map. */
function assertCoordinatePair(latitude?: number | null, longitude?: number | null): void {
  const hasLat = latitude !== undefined && latitude !== null;
  const hasLng = longitude !== undefined && longitude !== null;
  if (hasLat !== hasLng) {
    throw new BadRequestException(
      'Lintang dan bujur harus diisi keduanya atau dikosongkan keduanya.',
    );
  }
}

@Injectable()
export class SitesService {
  constructor(
    private readonly repo: SitesRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(query: ListSitesQueryDto): Promise<{ data: SiteDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      type: query.type,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toSiteDto)), total, query);
  }

  async getById(id: string): Promise<SiteDto> {
    const site = await this.repo.findById(id);
    if (!site) {
      throw new NotFoundException('Lokasi tidak ditemukan.');
    }
    return toSiteDto(site);
  }

  async create(dto: CreateSiteDto): Promise<SiteDto> {
    assertCoordinatePair(dto.latitude, dto.longitude);
    const site = await this.repo.create({
      type: dto.type,
      name: dto.name,
      address: dto.address,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });
    return toSiteDto(site);
  }

  async update(id: string, dto: UpdateSiteDto): Promise<SiteDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Lokasi tidak ditemukan.');
    }
    const effectiveLat =
      dto.latitude !== undefined
        ? dto.latitude
        : existing.latitude === null
          ? null
          : Number(existing.latitude);
    const effectiveLng =
      dto.longitude !== undefined
        ? dto.longitude
        : existing.longitude === null
          ? null
          : Number(existing.longitude);
    assertCoordinatePair(effectiveLat, effectiveLng);

    const site = await this.repo.update(id, {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
    });
    return toSiteDto(site);
  }

  async remove(id: string): Promise<{ message: string }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Lokasi tidak ditemukan.');
    }
    await this.repo.softDelete(id);
    return { message: 'Lokasi telah dihapus.' };
  }
}
