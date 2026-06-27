import { type PrismaService } from '../../prisma/prisma.service';

import { CorridorRepository } from './corridor.repository';

const LINE = {
  type: 'LineString',
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ],
};
const OVERRIDE = {
  type: 'LineString',
  coordinates: [
    [112.7, -7.2],
    [112.71, -7.21],
  ],
};

describe('CorridorRepository', () => {
  let prisma: { $queryRaw: jest.Mock; trip: { findFirst: jest.Mock } };
  let repo: CorridorRepository;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn(), trip: { findFirst: jest.fn() } };
    repo = new CorridorRepository(prisma as unknown as PrismaService);
  });

  describe('spatial helpers', () => {
    it('computeLengthMeters returns the computed length', async () => {
      prisma.$queryRaw.mockResolvedValue([{ len: 1234 }]);
      await expect(repo.computeLengthMeters(LINE)).resolves.toBe(1234);
    });

    it('computeLengthMeters defaults to 0 on an empty result', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await expect(repo.computeLengthMeters(LINE)).resolves.toBe(0);
    });

    it('isPointWithinCorridor returns the boolean', async () => {
      prisma.$queryRaw.mockResolvedValue([{ within: true }]);
      await expect(repo.isPointWithinCorridor(LINE, -7.25, 112.75, 150)).resolves.toBe(true);
    });

    it('distanceToCorridorMeters returns the distance', async () => {
      prisma.$queryRaw.mockResolvedValue([{ dist: 42 }]);
      await expect(repo.distanceToCorridorMeters(LINE, -7.3, 112.8)).resolves.toBe(42);
    });
  });

  describe('resolveTripCorridor', () => {
    it('returns null for an unknown trip', async () => {
      prisma.trip.findFirst.mockResolvedValue(null);
      await expect(repo.resolveTripCorridor('t1')).resolves.toBeNull();
    });

    it('prefers the per-day Trip override', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        geometryOverride: OVERRIDE,
        geometryToleranceM: 120,
        route: { corridors: [{ pathGeojson: LINE, toleranceMeters: 150 }] },
      });
      await expect(repo.resolveTripCorridor('t1')).resolves.toEqual({
        geojson: OVERRIDE,
        toleranceMeters: 120,
        source: 'trip-override',
      });
    });

    it("uses the trip's chosen Corridor over the legacy route template", async () => {
      prisma.trip.findFirst.mockResolvedValue({
        geometryOverride: null,
        geometryToleranceM: null,
        corridor: { pathGeojson: LINE, toleranceMeters: 200, deletedAt: null },
        route: { corridors: [{ pathGeojson: OVERRIDE, toleranceMeters: 150 }] },
      });
      await expect(repo.resolveTripCorridor('t1')).resolves.toEqual({
        geojson: LINE,
        toleranceMeters: 200,
        source: 'corridor',
      });
    });

    it('ignores a soft-deleted corridor and falls through to the template', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        geometryOverride: null,
        geometryToleranceM: null,
        corridor: { pathGeojson: LINE, toleranceMeters: 200, deletedAt: new Date() },
        route: { corridors: [{ pathGeojson: OVERRIDE, toleranceMeters: 150 }] },
      });
      await expect(repo.resolveTripCorridor('t1')).resolves.toEqual({
        geojson: OVERRIDE,
        toleranceMeters: 150,
        source: 'route-default',
      });
    });

    it('falls back to the route template when there is no override or corridor', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        geometryOverride: null,
        geometryToleranceM: null,
        corridor: null,
        route: { corridors: [{ pathGeojson: LINE, toleranceMeters: 150 }] },
      });
      await expect(repo.resolveTripCorridor('t1')).resolves.toEqual({
        geojson: LINE,
        toleranceMeters: 150,
        source: 'route-default',
      });
    });

    it('returns null when neither override nor template exists', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        geometryOverride: null,
        geometryToleranceM: null,
        route: { corridors: [] },
      });
      await expect(repo.resolveTripCorridor('t1')).resolves.toBeNull();
    });
  });
});
