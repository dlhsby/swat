import { ConflictException, NotFoundException } from '@nestjs/common';

import { type VehicleTypesRepository } from './vehicle-types.repository';
import { VehicleTypesService } from './vehicle-types.service';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Compactor',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('VehicleTypesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    countModels: jest.Mock;
    findByName: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: VehicleTypesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      countModels: jest.fn().mockResolvedValue(0),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new VehicleTypesService(repo as unknown as VehicleTypesRepository);
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

  it('rejects a duplicate name on create', async () => {
    repo.findByName.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' });
    await expect(service.create({ name: 'Compactor' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows renaming to the same row but blocks colliding with another', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.findByName.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' });
    await expect(
      service.update('00000000-0000-0000-0000-000000000001', { name: 'Taken' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s an unknown row on get/update', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('00000000-0000-0000-0000-000000000009')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update('00000000-0000-0000-0000-000000000009', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing row', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.update.mockResolvedValue(buildRow({ name: 'Edited' }));
    await expect(
      service.update('00000000-0000-0000-0000-000000000001', { name: 'Edited' }),
    ).resolves.toMatchObject({ name: 'Edited' });
  });

  it('blocks deletion while referenced by models', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.countModels.mockResolvedValue(2);
    await expect(service.remove('00000000-0000-0000-0000-000000000001')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced row', async () => {
    repo.findById.mockResolvedValue(buildRow());
    repo.delete.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' });
    await expect(service.remove('00000000-0000-0000-0000-000000000001')).resolves.toEqual({
      message: 'Aplikasi kendaraan telah dihapus.',
    });
  });
});
