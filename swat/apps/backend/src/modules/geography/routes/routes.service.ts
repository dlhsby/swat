import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type RouteCategory } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import { type CreateRouteDto } from './dto/create-route.dto';
import { type ListRoutesQueryDto } from './dto/list-routes.query.dto';
import { type UpdateRouteDto } from './dto/update-route.dto';
import { RoutesRepository, type RouteWithSites } from './routes.repository';

export interface RouteDto {
  readonly id: string;
  readonly category: RouteCategory;
  readonly originSiteId: string;
  readonly originSiteName: string;
  readonly destinationSiteId: string;
  readonly destinationSiteName: string;
  readonly distanceKm: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toRouteDto(route: RouteWithSites): RouteDto {
  return {
    id: route.id,
    category: route.category,
    originSiteId: route.originSiteId,
    originSiteName: route.originSite.name,
    destinationSiteId: route.destinationSiteId,
    destinationSiteName: route.destinationSite.name,
    distanceKm: route.distanceKm,
    createdAt: route.createdAt.toISOString(),
    updatedAt: route.updatedAt.toISOString(),
  };
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly repo: RoutesRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(query: ListRoutesQueryDto): Promise<{ data: RouteDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      category: query.category,
      originSiteId: query.originSiteId,
      destinationSiteId: query.destinationSiteId,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toRouteDto)), total, query);
  }

  async getById(id: string): Promise<RouteDto> {
    const route = await this.repo.findById(id);
    if (!route) {
      throw new NotFoundException('Rute tidak ditemukan.');
    }
    return toRouteDto(route);
  }

  async create(dto: CreateRouteDto): Promise<RouteDto> {
    if (dto.originSiteId === dto.destinationSiteId) {
      throw new BadRequestException('Lokasi asal dan tujuan tidak boleh sama.');
    }
    await this.assertSitesExist(dto.originSiteId, dto.destinationSiteId);
    const duplicate = await this.repo.findDuplicate(
      dto.originSiteId,
      dto.destinationSiteId,
      dto.category,
    );
    if (duplicate) {
      throw new ConflictException('Rute dengan asal, tujuan, dan kategori ini sudah ada.');
    }

    const route = await this.repo.create({
      category: dto.category,
      originSite: { connect: { id: dto.originSiteId } },
      destinationSite: { connect: { id: dto.destinationSiteId } },
      distanceKm: dto.distanceKm,
    });
    return toRouteDto(route);
  }

  async update(id: string, dto: UpdateRouteDto): Promise<RouteDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Rute tidak ditemukan.');
    }

    const originSiteId = dto.originSiteId ?? existing.originSiteId;
    const destinationSiteId = dto.destinationSiteId ?? existing.destinationSiteId;
    const category = dto.category ?? existing.category;

    if (originSiteId === destinationSiteId) {
      throw new BadRequestException('Lokasi asal dan tujuan tidak boleh sama.');
    }
    if (dto.originSiteId !== undefined || dto.destinationSiteId !== undefined) {
      await this.assertSitesExist(originSiteId, destinationSiteId);
    }
    const duplicate = await this.repo.findDuplicate(originSiteId, destinationSiteId, category, id);
    if (duplicate) {
      throw new ConflictException('Rute dengan asal, tujuan, dan kategori ini sudah ada.');
    }

    const route = await this.repo.update(id, {
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.originSiteId !== undefined
        ? { originSite: { connect: { id: dto.originSiteId } } }
        : {}),
      ...(dto.destinationSiteId !== undefined
        ? { destinationSite: { connect: { id: dto.destinationSiteId } } }
        : {}),
      ...(dto.distanceKm !== undefined ? { distanceKm: dto.distanceKm } : {}),
    });
    return toRouteDto(route);
  }

  async remove(id: string): Promise<{ message: string }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Rute tidak ditemukan.');
    }
    await this.repo.softDelete(id);
    return { message: 'Rute telah dihapus.' };
  }

  private async assertSitesExist(originSiteId: string, destinationSiteId: string): Promise<void> {
    const [origin, destination] = await Promise.all([
      this.repo.siteExists(originSiteId),
      this.repo.siteExists(destinationSiteId),
    ]);
    if (!origin || !destination) {
      throw new BadRequestException('Lokasi asal atau tujuan tidak ditemukan.');
    }
  }
}
