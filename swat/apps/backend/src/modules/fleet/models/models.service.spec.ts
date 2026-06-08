import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type VehicleModelsRepository } from './models.repository';
import { VehicleModelsService } from './models.service';

function buildModel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    applicationId: 1,
    fuelId: 1,
    brand: 'Hino',
    fuelTankCapacity: 200,
    normalFuelRatio: 1,
    normalTareWeight: 8000,
    maxNetLoad: 0,
    maxNetVolume: 0,
    wheelCount: 6,
    application: { id: 1, name: 'Dump Truck' },
    fuel: { id: 1, name: 'Solar' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('VehicleModelsService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    applicationExists: jest.Mock;
    fuelExists: jest.Mock;
    countVehicles: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: VehicleModelsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      applicationExists: jest.fn().mockResolvedValue({ id: 1 }),
      fuelExists: jest.fn().mockResolvedValue({ id: 1 }),
      countVehicles: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new VehicleModelsService(repo as unknown as VehicleModelsRepository);
  });

  const dto = {
    applicationId: 1,
    fuelId: 1,
    brand: 'Hino',
    fuelTankCapacity: 200,
    normalTareWeight: 8000,
    wheelCount: 6,
  };

  it('lists with application and fuel names joined', async () => {
    repo.list.mockResolvedValue({ rows: [buildModel()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ applicationName: 'Dump Truck', fuelName: 'Solar' });
  });

  it('rejects a missing application or fuel on create', async () => {
    repo.applicationExists.mockResolvedValueOnce(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    repo.applicationExists.mockResolvedValue({ id: 1 });
    repo.fuelExists.mockResolvedValueOnce(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a model', async () => {
    repo.create.mockResolvedValue(buildModel());
    await expect(service.create(dto)).resolves.toMatchObject({ brand: 'Hino', wheelCount: 6 });
  });

  it('404s on get/update and updates an existing model', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
    repo.findById.mockResolvedValue(buildModel());
    repo.update.mockResolvedValue(buildModel({ brand: 'Mitsubishi' }));
    await expect(service.update(1, { brand: 'Mitsubishi' })).resolves.toMatchObject({
      brand: 'Mitsubishi',
    });
  });

  it('blocks deletion while referenced by vehicles, else deletes', async () => {
    repo.findById.mockResolvedValue(buildModel());
    repo.countVehicles.mockResolvedValueOnce(1);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    repo.countVehicles.mockResolvedValueOnce(0);
    repo.delete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({ message: 'Model kendaraan telah dihapus.' });
  });
});
