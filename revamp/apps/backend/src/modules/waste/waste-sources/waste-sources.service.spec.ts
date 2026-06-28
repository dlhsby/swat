import { ConflictException, NotFoundException } from '@nestjs/common';

import { type ActorNamesService } from '../../audit/actor-names.service';

import { type WasteSourcesRepository } from './waste-sources.repository';
import { WasteSourcesService } from './waste-sources.service';

function buildSource(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    code: 'PS',
    name: 'Pasar',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('WasteSourcesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    countVehicleLinks: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: WasteSourcesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      countVehicleLinks: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new WasteSourcesService(
      repo as unknown as WasteSourcesRepository,
      {
        attach: async (_r: unknown, d: unknown[]) => d,
        resolve: async () => new Map<string, string>(),
      } as unknown as ActorNamesService,
    );
  });

  it('lists with pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildSource()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ code: 'PS' });
  });

  it('returns a single source or 404', async () => {
    repo.findById.mockResolvedValueOnce(buildSource());
    await expect(service.getById('550e8400-e29b-41d4-a716-446655440001')).resolves.toMatchObject({
      code: 'PS',
    });
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById('550e8400-e29b-41d4-a716-446655440099')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('create', () => {
    it('rejects a duplicate code', async () => {
      repo.findByCode.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440099' });
      await expect(service.create({ code: 'PS', name: 'Pasar' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates a waste source', async () => {
      repo.create.mockResolvedValue(buildSource());
      await expect(service.create({ code: 'PS', name: 'Pasar' })).resolves.toMatchObject({
        code: 'PS',
      });
    });
  });

  describe('update', () => {
    it('404s an unknown source', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440099', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects changing to an existing code', async () => {
      repo.findById.mockResolvedValue(buildSource({ code: 'PS' }));
      repo.findByCode.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440099' });
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', { code: 'PU' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates the name', async () => {
      repo.findById.mockResolvedValue(buildSource());
      repo.update.mockResolvedValue(buildSource({ name: 'Pasar Induk' }));
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', { name: 'Pasar Induk' }),
      ).resolves.toMatchObject({
        name: 'Pasar Induk',
      });
    });
  });

  describe('remove', () => {
    it('blocks deletion while referenced by vehicles', async () => {
      repo.findById.mockResolvedValue(buildSource());
      repo.countVehicleLinks.mockResolvedValue(3);
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440001')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced source', async () => {
      repo.findById.mockResolvedValue(buildSource());
      repo.delete.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' });
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440001')).resolves.toEqual({
        message: 'Sumber sampah telah dihapus.',
      });
    });

    it('404s an unknown source', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440099')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
