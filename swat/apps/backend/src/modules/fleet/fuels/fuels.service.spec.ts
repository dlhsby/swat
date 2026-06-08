import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type FuelsRepository } from './fuels.repository';
import { FuelsService } from './fuels.service';

function buildFuel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    fuelCategoryId: 1,
    name: 'Solar',
    pricePerLiter: 6800,
    fuelCategory: { id: 1, name: 'Bersubsidi' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('FuelsService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    categoryExists: jest.Mock;
    countModels: jest.Mock;
    findByNameInCategory: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: FuelsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      categoryExists: jest.fn().mockResolvedValue({ id: 1 }),
      countModels: jest.fn().mockResolvedValue(0),
      findByNameInCategory: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new FuelsService(repo as unknown as FuelsRepository);
  });

  const dto = { fuelCategoryId: 1, name: 'Solar', pricePerLiter: 6800 };

  it('lists with the category name joined', async () => {
    repo.list.mockResolvedValue({ rows: [buildFuel()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ fuelCategoryName: 'Bersubsidi', pricePerLiter: 6800 });
  });

  it('rejects a missing category on create', async () => {
    repo.categoryExists.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a fuel', async () => {
    repo.create.mockResolvedValue(buildFuel());
    await expect(service.create(dto)).resolves.toMatchObject({ name: 'Solar' });
  });

  it('rejects a duplicate name within the same category', async () => {
    repo.findByNameInCategory.mockResolvedValue({ id: 2 });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s on get and updates price', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
    repo.findById.mockResolvedValue(buildFuel());
    repo.update.mockResolvedValue(buildFuel({ pricePerLiter: 7000 }));
    await expect(service.update(1, { pricePerLiter: 7000 })).resolves.toMatchObject({
      pricePerLiter: 7000,
    });
  });

  it('rejects a missing category on update', async () => {
    repo.findById.mockResolvedValue(buildFuel());
    repo.categoryExists.mockResolvedValue(null);
    await expect(service.update(1, { fuelCategoryId: 99 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks deletion while referenced by models, else deletes', async () => {
    repo.findById.mockResolvedValue(buildFuel());
    repo.countModels.mockResolvedValueOnce(2);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    repo.countModels.mockResolvedValueOnce(0);
    repo.delete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({ message: 'Bahan bakar telah dihapus.' });
  });
});
