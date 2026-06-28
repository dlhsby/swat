import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { type CorridorsRepository } from './corridors.repository';
import { CorridorsService } from './corridors.service';
import { type GoogleDirectionsService } from './google-directions.service';

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
    findDefault: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    computeLengthMeters: jest.Mock;
    setRouteDistanceKm: jest.Mock;
  };
  let directions: { snapDrivingRoute: jest.Mock };
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
      findDefault: jest.fn().mockResolvedValue(corridorRow({ isDefault: true })),
      create: jest.fn((_routeId, _data, isDefault) => Promise.resolve(corridorRow({ isDefault }))),
      update: jest.fn().mockResolvedValue(corridorRow()),
      softDelete: jest.fn().mockResolvedValue(corridorRow()),
      computeLengthMeters: jest.fn().mockResolvedValue(6373),
      setRouteDistanceKm: jest.fn().mockResolvedValue(undefined),
    };
    // Default: no server key → straight-line fallback.
    directions = { snapDrivingRoute: jest.fn().mockResolvedValue(null) };
    service = new CorridorsService(
      repo as unknown as CorridorsRepository,
      directions as unknown as GoogleDirectionsService,
    );
  });

  describe('listForRoute', () => {
    it('404s an unknown route', async () => {
      repo.routeExists.mockResolvedValue(null);
      await expect(service.listForRoute(ROUTE)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the route corridors (default first)', async () => {
      repo.hasAny.mockResolvedValue(true); // already has corridors → no lazy create
      const rows = await service.listForRoute(ROUTE);
      expect(rows[0]).toMatchObject({ routeId: ROUTE, isDefault: true });
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('lazily backfills the default corridor when the route has none', async () => {
      repo.hasAny.mockResolvedValue(false);
      await service.listForRoute(ROUTE);
      // ensureDefaultForRoute → createDefaultForRoute → repo.create(isDefault=true).
      expect(repo.create).toHaveBeenCalledWith(ROUTE, expect.anything(), true);
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
    it('falls back to a straight line when Directions has no server key', async () => {
      directions.snapDrivingRoute.mockResolvedValue(null);
      const result = await service.createDefaultForRoute(ROUTE);
      expect(result?.isDefault).toBe(true);
      expect(repo.create).toHaveBeenCalledWith(
        ROUTE,
        expect.objectContaining({ source: 'straight' }),
        true,
      );
    });

    it('snaps the default to roads when Directions returns a path', async () => {
      directions.snapDrivingRoute.mockResolvedValue([
        [112.75, -7.25],
        [112.755, -7.255],
        [112.76, -7.26],
      ]);
      await service.createDefaultForRoute(ROUTE);
      expect(repo.create).toHaveBeenCalledWith(
        ROUTE,
        expect.objectContaining({ source: 'directions' }),
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

    it('resyncs the route distance after editing a corridor (snap-to-road bug)', async () => {
      // The default corridor is now 6373 m → the route distance should follow (6 km).
      repo.findDefault.mockResolvedValue(corridorRow({ isDefault: true, lengthMeters: 6373 }));
      await service.update(ID, { pathGeojson: LINE as unknown as Record<string, unknown> });
      expect(repo.setRouteDistanceKm).toHaveBeenCalledWith(ROUTE, 6);
    });

    it('404s when there is nothing to delete', async () => {
      repo.softDelete.mockResolvedValue(null);
      await expect(service.remove(ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resyncs the route distance after deleting a corridor', async () => {
      repo.findDefault.mockResolvedValue(null); // no default left → 0 km
      await service.remove(ID);
      expect(repo.setRouteDistanceKm).toHaveBeenCalledWith(ROUTE, 0);
    });
  });
});
