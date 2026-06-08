import { ConflictException, NotFoundException } from '@nestjs/common';

import { type WasteSourcesRepository } from './waste-sources.repository';
import { WasteSourcesService } from './waste-sources.service';

function buildSource(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
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
    service = new WasteSourcesService(repo as unknown as WasteSourcesRepository);
  });

  it('rejects a duplicate code', async () => {
    repo.findByCode.mockResolvedValue({ id: 9 });
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

  it('blocks deletion while referenced by vehicles', async () => {
    repo.findById.mockResolvedValue(buildSource());
    repo.countVehicleLinks.mockResolvedValue(3);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced waste source', async () => {
    repo.findById.mockResolvedValue(buildSource());
    repo.delete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({ message: 'Sumber sampah telah dihapus.' });
  });

  it('404s an unknown waste source', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
  });
});
