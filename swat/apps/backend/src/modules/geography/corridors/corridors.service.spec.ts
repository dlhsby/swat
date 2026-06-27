import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { type CorridorsRepository } from './corridors.repository';
import { CorridorsService } from './corridors.service';

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
    legacyId: null,
    name: 'TPS A → Benowo via Mastrip',
    category: 'DISPOSAL',
    originSiteId: null,
    originSite: null,
    destinationSiteId: null,
    destinationSite: null,
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
    list: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    computeLengthMeters: jest.Mock;
  };
  let service: CorridorsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn().mockResolvedValue({ rows: [corridorRow()], total: 1 }),
      findById: jest.fn().mockResolvedValue(corridorRow()),
      create: jest.fn().mockResolvedValue(corridorRow()),
      update: jest.fn().mockResolvedValue(corridorRow()),
      softDelete: jest.fn().mockResolvedValue(true),
      computeLengthMeters: jest.fn().mockResolvedValue(6373),
    };
    service = new CorridorsService(repo as unknown as CorridorsRepository);
  });

  describe('list', () => {
    it('maps rows to DTOs (with site names)', async () => {
      const result = await service.list({ page: 1, limit: 20 });
      expect(result.data[0]).toMatchObject({ id: ID, name: 'TPS A → Benowo via Mastrip' });
      expect(result.meta.total).toBe(1);
    });
  });

  describe('create', () => {
    it('validates geometry, computes length, and normalizes the name', async () => {
      const result = await service.create({
        name: '  Benowo via Tol  ',
        pathGeojson: LINE as unknown as Record<string, unknown>,
        category: 'DISPOSAL',
      });
      expect(repo.computeLengthMeters).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Benowo via Tol',
          lengthMeters: 6373,
          category: 'DISPOSAL',
        }),
      );
      expect(result.lengthMeters).toBe(6373);
    });

    it('rejects a non-LineString with 422', async () => {
      await expect(
        service.create({
          name: 'bad',
          pathGeojson: { type: 'Point', coordinates: [1, 2] } as Record<string, unknown>,
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('maps a PostGIS rejection to 422', async () => {
      repo.computeLengthMeters.mockRejectedValue(new Error('ST parse error'));
      await expect(
        service.create({ name: 'x', pathGeojson: LINE as unknown as Record<string, unknown> }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('persists waypoints and defaults the optional fields', async () => {
      const waypoints = [{ lng: 1, lat: 2, snapped: true }];
      await service.create({
        name: 'x',
        pathGeojson: LINE as unknown as Record<string, unknown>,
        waypoints,
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ waypoints, toleranceMeters: 150, source: 'google-maps' }),
      );
    });
  });

  describe('update', () => {
    it('404s an unknown corridor', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ID, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('recomputes length only when the path changes', async () => {
      await service.update(ID, { name: 'renamed' });
      expect(repo.computeLengthMeters).not.toHaveBeenCalled();

      await service.update(ID, { pathGeojson: LINE as unknown as Record<string, unknown> });
      expect(repo.computeLengthMeters).toHaveBeenCalled();
      expect(repo.update).toHaveBeenLastCalledWith(
        ID,
        expect.objectContaining({ lengthMeters: 6373 }),
      );
    });
  });

  describe('getById / remove', () => {
    it('404s an unknown corridor on getById', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getById(ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when there is nothing to delete', async () => {
      repo.softDelete.mockResolvedValue(false);
      await expect(service.remove(ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns a message when deleted', async () => {
      await expect(service.remove(ID)).resolves.toEqual({ message: 'Koridor telah dihapus.' });
    });
  });
});
