import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { type CorridorRepository } from './corridor.repository';
import { type RouteGeometryRepository } from './route-geometry.repository';
import { RouteGeometryService } from './route-geometry.service';

const ROUTE = '00000000-0000-0000-0000-0000000000r1';
const TRIP = '00000000-0000-0000-0000-0000000000t1';
const LINE = {
  type: 'LineString',
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ],
};

function geometryRow(): Record<string, unknown> {
  return {
    routeId: ROUTE,
    pathGeojson: LINE,
    toleranceMeters: 150,
    lengthMeters: 1200,
    source: 'google-maps',
    updatedAt: new Date('2026-06-25T00:00:00Z'),
  };
}

describe('RouteGeometryService', () => {
  let repo: {
    findByRouteId: jest.Mock;
    routeExists: jest.Mock;
    upsertTemplate: jest.Mock;
    deleteTemplate: jest.Mock;
    tripOverride: jest.Mock;
    setTripOverride: jest.Mock;
    clearTripOverride: jest.Mock;
    corridorInRoute: jest.Mock;
    setTripCorridor: jest.Mock;
  };
  let corridor: { computeLengthMeters: jest.Mock };
  let service: RouteGeometryService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      findByRouteId: jest.fn(),
      routeExists: jest.fn().mockResolvedValue({ id: ROUTE }),
      upsertTemplate: jest.fn().mockResolvedValue(geometryRow()),
      deleteTemplate: jest.fn().mockResolvedValue(true),
      tripOverride: jest.fn().mockResolvedValue({
        routeId: ROUTE,
        corridorId: null,
        corridor: null,
        geometryOverride: null,
        geometryWaypoints: null,
        geometryToleranceM: null,
      }),
      setTripOverride: jest.fn().mockResolvedValue(undefined),
      clearTripOverride: jest.fn().mockResolvedValue(undefined),
      corridorInRoute: jest.fn().mockResolvedValue({ id: 'c1' }),
      setTripCorridor: jest.fn().mockResolvedValue(undefined),
    };
    corridor = { computeLengthMeters: jest.fn().mockResolvedValue(1200) };
    service = new RouteGeometryService(
      repo as unknown as RouteGeometryRepository,
      corridor as unknown as CorridorRepository,
    );
  });

  describe('getTemplate', () => {
    it('throws NotFound for an unknown route', async () => {
      repo.routeExists.mockResolvedValue(null);
      await expect(service.getTemplate(ROUTE)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns null when the route has no corridor yet', async () => {
      repo.findByRouteId.mockResolvedValue(null);
      await expect(service.getTemplate(ROUTE)).resolves.toBeNull();
    });

    it('maps an existing template to a DTO', async () => {
      repo.findByRouteId.mockResolvedValue(geometryRow());
      await expect(service.getTemplate(ROUTE)).resolves.toMatchObject({
        routeId: ROUTE,
        lengthMeters: 1200,
        toleranceMeters: 150,
      });
    });
  });

  describe('upsertTemplate', () => {
    it('computes length and upserts a valid corridor', async () => {
      const dto = { pathGeojson: LINE as unknown as Record<string, unknown>, toleranceMeters: 200 };
      const result = await service.upsertTemplate(ROUTE, dto);
      expect(corridor.computeLengthMeters).toHaveBeenCalled();
      expect(repo.upsertTemplate).toHaveBeenCalledWith(
        ROUTE,
        expect.objectContaining({
          toleranceMeters: 200,
          lengthMeters: 1200,
          source: 'google-maps',
        }),
      );
      expect(result.lengthMeters).toBe(1200);
    });

    it('persists editor waypoints and defaults them to null', async () => {
      const waypoints = [
        { lng: 1, lat: 2, snapped: true },
        { lng: 3, lat: 4, snapped: false },
      ];
      repo.upsertTemplate.mockResolvedValue({ ...geometryRow(), waypoints });
      const dto = {
        pathGeojson: LINE as unknown as Record<string, unknown>,
        waypoints,
      };
      const result = await service.upsertTemplate(ROUTE, dto);
      expect(repo.upsertTemplate).toHaveBeenCalledWith(
        ROUTE,
        expect.objectContaining({ waypoints }),
      );
      expect(result.waypoints).toEqual(waypoints);

      // Omitting waypoints passes null through (clears the column).
      await service.upsertTemplate(ROUTE, {
        pathGeojson: LINE as unknown as Record<string, unknown>,
      });
      expect(repo.upsertTemplate).toHaveBeenLastCalledWith(
        ROUTE,
        expect.objectContaining({ waypoints: null }),
      );
    });

    it('rejects an invalid LineString with 422', async () => {
      const dto = {
        pathGeojson: { type: 'Point', coordinates: [1, 2] } as Record<string, unknown>,
      };
      await expect(service.upsertTemplate(ROUTE, dto)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(repo.upsertTemplate).not.toHaveBeenCalled();
    });

    it('maps a PostGIS rejection to 422', async () => {
      corridor.computeLengthMeters.mockRejectedValue(new Error('ST_GeomFromGeoJSON: parse error'));
      const dto = { pathGeojson: LINE as unknown as Record<string, unknown> };
      await expect(service.upsertTemplate(ROUTE, dto)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('returns a message when deleted', async () => {
      await expect(service.deleteTemplate(ROUTE)).resolves.toEqual({
        message: 'Koridor rute telah dihapus.',
      });
    });

    it('throws NotFound when there is no template to delete', async () => {
      repo.deleteTemplate.mockResolvedValue(false);
      await expect(service.deleteTemplate(ROUTE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('trip override', () => {
    it('throws NotFound for an unknown trip', async () => {
      repo.tripOverride.mockResolvedValue(null);
      await expect(service.getTripOverride(TRIP)).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.setTripOverride(TRIP, { pathGeojson: LINE as unknown as Record<string, unknown> }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.clearTripOverride(TRIP)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets a valid override with waypoints', async () => {
      const waypoints = [{ lng: 1, lat: 2, snapped: true }];
      // The service re-reads via getTripOverride after the write — reflect the saved state.
      repo.tripOverride.mockResolvedValue({
        routeId: ROUTE,
        corridorId: null,
        corridor: null,
        geometryOverride: LINE,
        geometryWaypoints: waypoints,
        geometryToleranceM: 120,
      });
      const result = await service.setTripOverride(TRIP, {
        pathGeojson: LINE as unknown as Record<string, unknown>,
        toleranceMeters: 120,
        waypoints,
      });
      expect(repo.setTripOverride).toHaveBeenCalledWith(
        TRIP,
        expect.objectContaining({ toleranceMeters: 120, waypoints }),
      );
      expect(result.waypoints).toEqual(waypoints);
      expect(result.hasOverride).toBe(true);
    });

    it('clears an override', async () => {
      await expect(service.clearTripOverride(TRIP)).resolves.toMatchObject({
        message: expect.stringContaining('dihapus'),
      });
      expect(repo.clearTripOverride).toHaveBeenCalledWith(TRIP);
    });
  });

  describe('setTripCorridor', () => {
    it('throws NotFound for an unknown trip', async () => {
      repo.tripOverride.mockResolvedValue(null);
      await expect(service.setTripCorridor(TRIP, 'c1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('picks a corridor that belongs to the trip route (clearing any override)', async () => {
      repo.corridorInRoute.mockResolvedValue({ id: 'c2' });
      await service.setTripCorridor(TRIP, 'c2');
      expect(repo.corridorInRoute).toHaveBeenCalledWith('c2', ROUTE);
      expect(repo.setTripCorridor).toHaveBeenCalledWith(TRIP, 'c2');
    });

    it('rejects a corridor that is not on the trip route', async () => {
      repo.corridorInRoute.mockResolvedValue(null);
      await expect(service.setTripCorridor(TRIP, 'c9')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(repo.setTripCorridor).not.toHaveBeenCalled();
    });

    it('clears the explicit corridor with a null id (tracks the route default)', async () => {
      await service.setTripCorridor(TRIP, null);
      expect(repo.corridorInRoute).not.toHaveBeenCalled();
      expect(repo.setTripCorridor).toHaveBeenCalledWith(TRIP, null);
    });
  });
});
