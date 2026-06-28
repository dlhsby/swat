import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RouteCategory } from '@prisma/client';

import { type ActorNamesService } from '../../audit/actor-names.service';
import { type CorridorsService } from '../corridors/corridors.service';

import { type RoutesRepository } from './routes.repository';
import { RoutesService } from './routes.service';

function buildRoute(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    category: RouteCategory.DISPOSAL,
    originSiteId: '550e8400-e29b-41d4-a716-446655440002',
    destinationSiteId: '550e8400-e29b-41d4-a716-446655440003',
    distanceKm: 25,
    originSite: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'TPS', type: 'TPS' },
    destinationSite: { id: '550e8400-e29b-41d4-a716-446655440003', name: 'TPA', type: 'TPA' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('RoutesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findDuplicate: jest.Mock;
    siteExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let corridors: { createDefaultForRoute: jest.Mock; regenerateDefaultForRoute: jest.Mock };
  let service: RoutesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findDuplicate: jest.fn().mockResolvedValue(null),
      siteExists: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    corridors = {
      // Default: no corridor (e.g. a site without coords) → distance stays as-is.
      createDefaultForRoute: jest.fn().mockResolvedValue(null),
      regenerateDefaultForRoute: jest.fn().mockResolvedValue(null),
    };
    service = new RoutesService(
      repo as unknown as RoutesRepository,
      {
        attach: async (_r: unknown, d: unknown[]) => d,
        resolve: async () => new Map<string, string>(),
      } as unknown as ActorNamesService,
      corridors as unknown as CorridorsService,
    );
  });

  const dto = {
    category: RouteCategory.DISPOSAL,
    originSiteId: '550e8400-e29b-41d4-a716-446655440002',
    destinationSiteId: '550e8400-e29b-41d4-a716-446655440003',
    distanceKm: 25,
  };

  it('lists routes with site names and pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildRoute()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ originSiteName: 'TPS', destinationSiteName: 'TPA' });
  });

  it('returns a single route or 404', async () => {
    repo.findById.mockResolvedValueOnce(buildRoute());
    await expect(service.getById('550e8400-e29b-41d4-a716-446655440001')).resolves.toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440001',
      distanceKm: 25,
    });
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById('550e8400-e29b-41d4-a716-446655440099')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('create', () => {
    it('rejects identical origin and destination', async () => {
      await expect(
        service.create({ ...dto, destinationSiteId: '550e8400-e29b-41d4-a716-446655440002' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows a pool-anchored self-loop (DEPART_POOL, same site, distance 0)', async () => {
      const pool = '550e8400-e29b-41d4-a716-446655440002';
      repo.create.mockResolvedValue(
        buildRoute({
          category: RouteCategory.DEPART_POOL,
          originSiteId: pool,
          destinationSiteId: pool,
          distanceKm: 0,
        }),
      );
      await expect(
        service.create({
          category: RouteCategory.DEPART_POOL,
          originSiteId: pool,
          destinationSiteId: pool,
          distanceKm: 0,
        }),
      ).resolves.toMatchObject({ category: RouteCategory.DEPART_POOL });
    });

    it('rejects a missing site', async () => {
      repo.siteExists.mockResolvedValueOnce(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate triple', async () => {
      repo.findDuplicate.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440099' });
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a route and labels the sites', async () => {
      repo.create.mockResolvedValue(buildRoute());
      await expect(service.create(dto)).resolves.toMatchObject({
        originSiteName: 'TPS',
        destinationSiteName: 'TPA',
      });
    });

    it('returns the corridor-derived distance after creating the default corridor', async () => {
      repo.create.mockResolvedValue(buildRoute({ distanceKm: 0 }));
      // createDefaultForRoute syncs route.distanceKm in the corridor layer; the
      // service re-reads the route to return the synced value.
      repo.findById.mockResolvedValue(buildRoute({ distanceKm: 5 }));
      const result = await service.create(dto);
      expect(corridors.createDefaultForRoute).toHaveBeenCalled();
      expect(result.distanceKm).toBe(5);
    });
  });

  describe('update', () => {
    it('404s an unknown route', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440099', { distanceKm: 30 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an update that makes origin == destination', async () => {
      repo.findById.mockResolvedValue(buildRoute());
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', {
          destinationSiteId: '550e8400-e29b-41d4-a716-446655440002',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks an update that collides with another route', async () => {
      repo.findById.mockResolvedValue(buildRoute());
      repo.findDuplicate.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440010' });
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', { distanceKm: 30 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('resets the default corridor on any edit and re-reads the derived distance', async () => {
      // Every edit regenerates the auto-default (so newly-added site coords take
      // effect); the distance comes from the post-regenerate re-read.
      repo.findById
        .mockResolvedValueOnce(buildRoute()) // pre-update load
        .mockResolvedValueOnce(buildRoute({ distanceKm: 4 })); // post-regenerate re-read
      repo.update.mockResolvedValue(buildRoute());
      const result = await service.update('550e8400-e29b-41d4-a716-446655440001', {
        category: RouteCategory.PICKUP,
      });
      expect(corridors.regenerateDefaultForRoute).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
      );
      expect(result.distanceKm).toBe(4);
    });
  });

  describe('remove', () => {
    it('404s an unknown route', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440099')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('soft-deletes a route', async () => {
      repo.findById.mockResolvedValue(buildRoute());
      repo.softDelete.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' });
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440001')).resolves.toEqual({
        message: 'Rute telah dihapus.',
      });
    });
  });
});
