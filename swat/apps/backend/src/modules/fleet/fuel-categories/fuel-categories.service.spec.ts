import { ConflictException, NotFoundException } from '@nestjs/common';

import { type FuelCategoriesRepository } from './fuel-categories.repository';
import { FuelCategoriesService } from './fuel-categories.service';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: 'Bersubsidi',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('FuelCategoriesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    countFuels: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: FuelCategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      countFuels: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new FuelCategoriesService(repo as unknown as FuelCategoriesRepository);
  });

  it('lists with meta and creates', async () => {
    repo.list.mockResolvedValue({ rows: [buildRow()], total: 1 });
    await expect(service.list({ page: 1, limit: 20 })).resolves.toMatchObject({
      meta: { total: 1, page: 1, limit: 20 },
    });
    repo.create.mockResolvedValue(buildRow({ name: 'Non-Subsidi' }));
    await expect(service.create({ name: 'Non-Subsidi' })).resolves.toMatchObject({
      name: 'Non-Subsidi',
    });
  });

  it('404s unknown on get and update', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(9, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing row', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.update.mockResolvedValue(buildRow({ name: 'Edited' }));
    await expect(service.update(1, { name: 'Edited' })).resolves.toMatchObject({ name: 'Edited' });
  });

  it('blocks deletion while referenced by fuels, else deletes', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.countFuels.mockResolvedValueOnce(3);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    repo.countFuels.mockResolvedValueOnce(0);
    repo.delete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({
      message: 'Kategori bahan bakar telah dihapus.',
    });
  });
});
