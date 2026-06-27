import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { type CorridorsRepository } from './corridors.repository';
import { CorridorsService } from './corridors.service';

const ROUTE = '00000000-0000-0000-0000-0000000000r1';
const ID = '00000000-0000-0000-0000-0000000000c1';
const LINE = {
  type: 'LineString',
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ],
};

function corridorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ID,
    routeId: ROUTE,
    name: 'Benowo via Mastrip',
    isDefault: false,
    pathGeojson: LINE,
    waypoints: null,
    toleranceMeters: 150,
    lengthMeters: 6373,
    source: 'google-maps',
    createdAt: new Date('2026-06-27T00:00:00Z'),
    updatedAt: new Date('2026-06-27T00:00:00Z'),
    ...overrides,
  };
}

describe('CorridorsService', () => {
  let repo: {
    routeExists: jest.Mock;
    routeEndpoints: jest.Mock;
    listForRoute: jest.Mock;
    findById: jest.Mock;
    hasAny: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    computeLengthMeters: jest.Mock;
  };
  let service: CorridorsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      routeExists: jest.fn().mockResolvedValue({ id: ROUTE }),
      routeEndpoints: jest.fn().mockResolvedValue({
        originSite: { latitude: -7.25, longitude: 112.75 },
        destinationSite: { latitude: -7.26, longitude: 112.76 },
      }),
      listForRoute: jest.fn().mockResolvedValue([corridorRow({ isDefault: true })]),
      findById: jest.fn().mockResolvedValue(corridorRow()),
      hasAny: jest.fn().mockResolvedValue(false),
      create: jest.fn((_routeId, _data, isDefault) => Promise.resolve(corridorRow({ isDefault }))),
      update: jest.fn().mockResolvedValue(corridorRow()),
      softDelete: jest.fn().mockResolvedValue(corridorRow()),
      computeLengthMeters: jest.fn().mockResolvedValue(6373),
    };
    service = new CorridorsService(repo as unknown as CorridorsRepository);
  });

  describe('listForRoute', () => {
    it('404s an unknown route', async () => {
      repo.routeExists.mockResolvedValue(null);
      await expect(service.listForRoute(ROUTE)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the route corridors (default first)', async () => {
      const rows = await service.listForRoute(ROUTE);
      expect(rows[0]).toMatchObject({ routeId: ROUTE, isDefault: true });
    });
  });

  describe('create', () => {
    it("makes the route's first corridor the default", async () => {
      repo.hasAny.mockResolvedValue(false);
      const result = await service.create(ROUTE, {
        name: '  Mastrip  ',
        pathGeojson: LINE as unknown as Record<string, unknown>,
      });
      expect(repo.create).toHaveBeenCalledWith(
        ROUTE,
        expect.objectContaining({ name: 'Mastrip', lengthMeters: 6373 }),
        true,
      );
      expect(result.isDefault).toBe(true);
    });

    it('marks subsequent corridors non-default', async () => {
      repo.hasAny.mockResolvedValue(true);
      await service.create(ROUTE, {
        name: 'Tol',
        pathGeojson: LINE as unknown as Record<string, unknown>,
      });
      expect(repo.create).toHaveBeenCalledWith(ROUTE, expect.any(Object), false);
    });

    it('rejects a non-LineString with 422', async () => {
      await expect(
        service.create(ROUTE, {
          name: 'bad',
          pathGeojson: { type: 'Point', coordinates: [1, 2] } as Record<string, unknown>,
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('createDefaultForRoute', () => {
    it('builds a straight line between the two sites', async () => {
      const result = await service.createDefaultForRoute(ROUTE);
      expect(result?.isDefault).toBe(true);
      expect(repo.create).toHaveBeenCalledWith(
        ROUTE,
        expect.objectContaining({ source: 'default' }),
        true,
      );
    });

    it('skips (returns null) when a site has no coordinates', async () => {
      repo.routeEndpoints.mockResolvedValue({
        originSite: { latitude: null, longitude: null },
        destinationSite: { latitude: -7.26, longitude: 112.76 },
      });
      await expect(service.createDefaultForRoute(ROUTE)).resolves.toBeNull();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('update / remove', () => {
    it('404s an unknown corridor on update', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ID, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('recomputes length when the path changes', async () => {
      await service.update(ID, { pathGeojson: LINE as unknown as Record<string, unknown> });
      expect(repo.computeLengthMeters).toHaveBeenCalled();
    });

    it('404s when there is nothing to delete', async () => {
      repo.softDelete.mockResolvedValue(null);
      await expect(service.remove(ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
