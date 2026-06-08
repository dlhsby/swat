import { ConflictException, NotFoundException } from '@nestjs/common';

import { type ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: 'Compactor',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('ApplicationsService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    countModels: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: ApplicationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      countModels: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new ApplicationsService(repo as unknown as ApplicationsRepository);
  });

  it('lists with pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildRow()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ name: 'Compactor' });
  });

  it('creates', async () => {
    repo.create.mockResolvedValue(buildRow({ name: 'Arm Roll' }));
    await expect(service.create({ name: 'Arm Roll' })).resolves.toMatchObject({ name: 'Arm Roll' });
  });

  it('404s an unknown row on get/update', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(9, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing row', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.update.mockResolvedValue(buildRow({ name: 'Edited' }));
    await expect(service.update(1, { name: 'Edited' })).resolves.toMatchObject({ name: 'Edited' });
  });

  it('blocks deletion while referenced by models', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.countModels.mockResolvedValue(2);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced row', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.delete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({
      message: 'Aplikasi kendaraan telah dihapus.',
    });
  });
});
