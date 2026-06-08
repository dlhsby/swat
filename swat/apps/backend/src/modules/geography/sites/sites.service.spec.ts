import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type SitesRepository } from './sites.repository';
import { SitesService } from './sites.service';

function buildSite(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    type: 'POOL',
    name: 'Pool Pusat',
    address: 'Surabaya',
    latitude: null,
    longitude: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('SitesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let service: SitesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new SitesService(repo as unknown as SitesRepository);
  });

  it('lists with pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildSite()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]?.latitude).toBeNull();
  });

  it('returns a single site', async () => {
    repo.findById.mockResolvedValue(buildSite({ latitude: -7.25, longitude: 112.75 }));
    await expect(service.getById(1)).resolves.toMatchObject({
      id: 1,
      latitude: -7.25,
      longitude: 112.75,
    });
  });

  it('404s an unknown site', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('create', () => {
    it('rejects a partial coordinate pair', async () => {
      await expect(
        service.create({ type: 'TPA', name: 'X', address: 'Y', latitude: -7.2 } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('accepts both coordinates and maps Decimal to number', async () => {
      repo.create.mockResolvedValue(buildSite({ latitude: -7.25, longitude: 112.75 }));
      const result = await service.create({
        type: 'TPA',
        name: 'TPA Benowo',
        address: 'Benowo',
        latitude: -7.25,
        longitude: 112.75,
      } as never);
      expect(result.latitude).toBe(-7.25);
      expect(result.longitude).toBe(112.75);
    });

    it('accepts no coordinates', async () => {
      repo.create.mockResolvedValue(buildSite());
      await expect(
        service.create({ type: 'POOL', name: 'Pool', address: 'A' } as never),
      ).resolves.toMatchObject({ latitude: null });
    });
  });

  describe('update', () => {
    it('rejects when the resulting pair would be partial', async () => {
      repo.findById.mockResolvedValue(buildSite({ latitude: null, longitude: null }));
      await expect(service.update(1, { latitude: -7.2 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('updates name', async () => {
      repo.findById.mockResolvedValue(buildSite());
      repo.update.mockResolvedValue(buildSite({ name: 'Renamed' }));
      await expect(service.update(1, { name: 'Renamed' })).resolves.toMatchObject({
        name: 'Renamed',
      });
    });
  });

  it('soft-deletes', async () => {
    repo.findById.mockResolvedValue(buildSite());
    repo.softDelete.mockResolvedValue(buildSite());
    await expect(service.remove(1)).resolves.toEqual({ message: 'Lokasi telah dihapus.' });
  });
});
