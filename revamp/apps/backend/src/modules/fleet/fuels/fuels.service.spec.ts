import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type ActorNamesService } from '../../audit/actor-names.service';

import { type FuelsRepository } from './fuels.repository';
import { FuelsService } from './fuels.service';

function buildFuel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    fuelCategoryId: '00000000-0000-0000-0000-000000000001',
    name: 'Solar',
    pricePerLiter: 6800,
    fuelCategory: { id: '00000000-0000-0000-0000-000000000001', name: 'Bersubsidi' },
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
      categoryExists: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }),
      countModels: jest.fn().mockResolvedValue(0),
      findByNameInCategory: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new FuelsService(
      repo as unknown as FuelsRepository,
      {
        attach: async (_r: unknown, d: unknown[]) => d,
        resolve: async () => new Map<string, string>(),
      } as unknown as ActorNamesService,
    );
  });

  const dto = {
    fuelCategoryId: '00000000-0000-0000-0000-000000000001',
    name: 'Solar',
    pricePerLiter: 6800,
  };

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
    repo.findByNameInCategory.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s on get and updates price', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById('00000000-0000-0000-0000-000000000009')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repo.findById.mockResolvedValue(buildFuel());
    repo.update.mockResolvedValue(buildFuel({ pricePerLiter: 7000 }));
    await expect(
      service.update('00000000-0000-0000-0000-000000000001', { pricePerLiter: 7000 }),
    ).resolves.toMatchObject({
      pricePerLiter: 7000,
    });
  });

  it('rejects a missing category on update', async () => {
    repo.findById.mockResolvedValue(buildFuel());
    repo.categoryExists.mockResolvedValue(null);
    await expect(
      service.update('00000000-0000-0000-0000-000000000001', {
        fuelCategoryId: '00000000-0000-0000-0000-000000000099',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deletion while referenced by models, else deletes', async () => {
    repo.findById.mockResolvedValue(buildFuel());
    repo.countModels.mockResolvedValueOnce(2);
    await expect(service.remove('00000000-0000-0000-0000-000000000001')).rejects.toBeInstanceOf(
      ConflictException,
    );
    repo.countModels.mockResolvedValueOnce(0);
    repo.delete.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' });
    await expect(service.remove('00000000-0000-0000-0000-000000000001')).resolves.toEqual({
      message: 'Bahan bakar telah dihapus.',
    });
  });
});
