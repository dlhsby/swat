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
import { CorridorsService } from '../corridors/corridors.service';

import { type CreateRouteDto } from './dto/create-route.dto';
import { type ListRoutesQueryDto } from './dto/list-routes.query.dto';
import { type UpdateRouteDto } from './dto/update-route.dto';
import { RoutesRepository, type RouteWithSites } from './routes.repository';

// Pool-anchored legs ("Berangkat dari Pool" / "Kembali ke Pool") are legitimately
// recorded with the same site for origin and destination; every other category is
// a real trip between two distinct sites.
const SELF_LOOP_ALLOWED: ReadonlySet<RouteCategory> = new Set<RouteCategory>([
  'DEPART_POOL',
  'RETURN_POOL',
]);

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

/** Slim route for the record board (location suggestions + route resolution). */
export interface BoardRouteDto {
  readonly id: string;
  readonly category: RouteCategory;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
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
    private readonly corridors: CorridorsService,
  ) {}

  async list(query: ListRoutesQueryDto): Promise<{ data: RouteDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      category: query.category,
      originSiteId: query.originSiteId,
      destinationSiteId: query.destinationSiteId,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toRouteDto)), total, query);
  }

  /** All active routes, slimmed for the record board (single small payload). */
  async boardSummary(): Promise<BoardRouteDto[]> {
    const rows = await this.repo.boardSummary();
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      originSiteName: r.originSite.name,
      destinationSiteName: r.destinationSite.name,
    }));
  }

  async getById(id: string): Promise<RouteDto> {
    const route = await this.repo.findById(id);
    if (!route) {
      throw new NotFoundException('Rute tidak ditemukan.');
    }
    return toRouteDto(route);
  }

  async create(dto: CreateRouteDto): Promise<RouteDto> {
    if (dto.originSiteId === dto.destinationSiteId && !SELF_LOOP_ALLOWED.has(dto.category)) {
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
      distanceKm: dto.distanceKm ?? 0,
    });
    // Every route gets a default corridor (road-snapped, else a straight line between
    // its two sites); skipped silently when a site has no coordinates yet. The corridor
    // owns the distance — creating it syncs `route.distanceKm` — so re-read to return it.
    await this.corridors.createDefaultForRoute(route.id);
    return toRouteDto((await this.repo.findById(route.id)) ?? route);
  }

  /**
   * Find the active route for an (origin, destination, category) triple, creating
   * it on the fly when absent. Mirrors the legacy "pick start + end → reuse or add
   * the route" flow used by the trip-template planner, so operators never browse the
   * full route catalogue. Auto-created routes start at distance 0 (legacy distances
   * are frequently unknown); edit them later in Lokasi & Rute if needed.
   */
  async resolveOrCreate(
    category: RouteCategory,
    originSiteId: string,
    destinationSiteId: string,
  ): Promise<RouteDto> {
    if (originSiteId === destinationSiteId && !SELF_LOOP_ALLOWED.has(category)) {
      throw new BadRequestException('Lokasi asal dan tujuan tidak boleh sama.');
    }
    const existing = await this.repo.findDuplicate(originSiteId, destinationSiteId, category);
    if (existing) {
      return this.getById(existing.id);
    }
    return this.create({ category, originSiteId, destinationSiteId, distanceKm: 0 });
  }

  async update(id: string, dto: UpdateRouteDto): Promise<RouteDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Rute tidak ditemukan.');
    }

    const originSiteId = dto.originSiteId ?? existing.originSiteId;
    const destinationSiteId = dto.destinationSiteId ?? existing.destinationSiteId;
    const category: RouteCategory = dto.category ?? existing.category;

    if (originSiteId === destinationSiteId && !SELF_LOOP_ALLOWED.has(category)) {
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
    // Editing a route RESETS its auto-default corridor: regenerate (re-snap) it to the
    // current endpoints and re-derive the distance. This makes a route pick up site
    // coordinates that were added after it was first created (when the sites had none,
    // so no corridor could be drawn), and keeps the path matching the route. Returns
    // null silently when a site still has no coordinates → the manager shows the hint.
    await this.corridors.regenerateDefaultForRoute(id);
    return toRouteDto((await this.repo.findById(id)) ?? route);
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
