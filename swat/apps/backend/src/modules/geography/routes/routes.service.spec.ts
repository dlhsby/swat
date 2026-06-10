import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RouteCategory } from '@prisma/client';

import { type ActorNamesService } from '../../audit/actor-names.service';

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
    service = new RoutesService(
      repo as unknown as RoutesRepository,
      {
        attach: async (_r: unknown, d: unknown[]) => d,
        resolve: async () => new Map<string, string>(),
      } as unknown as ActorNamesService,
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

    it('updates the distance', async () => {
      repo.findById.mockResolvedValue(buildRoute());
      repo.update.mockResolvedValue(buildRoute({ distanceKm: 30 }));
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', { distanceKm: 30 }),
      ).resolves.toMatchObject({
        distanceKm: 30,
      });
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
