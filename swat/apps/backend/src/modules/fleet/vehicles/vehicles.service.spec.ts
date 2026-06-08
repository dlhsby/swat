import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';

import { type VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';

function buildVehicle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    plateNumber: 'L 1234 AB',
    status: VehicleStatus.GOOD,
    poolSiteId: 1,
    modelId: 1,
    chassisNumber: 'C1',
    engineNumber: 'E1',
    manufactureYear: 2020,
    currentFuelRatio: 1,
    currentTareWeight: 8000,
    currentOdometer: 100000,
    registrationExpiry: new Date('2027-01-01T00:00:00Z'),
    taxExpiry: new Date('2027-01-01T00:00:00Z'),
    notes: null,
    model: { id: 1, brand: 'Hino' },
    poolSite: { id: 1, name: 'Pool' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('VehiclesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByPlate: jest.Mock;
    modelExists: jest.Mock;
    siteExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let service: VehiclesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByPlate: jest.fn(),
      modelExists: jest.fn().mockResolvedValue({ id: 1 }),
      siteExists: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new VehiclesService(repo as unknown as VehiclesRepository);
  });

  const dto = {
    poolSiteId: 1,
    modelId: 1,
    plateNumber: 'L 1234 AB',
    chassisNumber: 'C1',
    engineNumber: 'E1',
    currentTareWeight: 8000,
    currentOdometer: 100000,
    registrationExpiry: '2027-01-01',
    taxExpiry: '2027-01-01',
  };

  it('rejects a missing model', async () => {
    repo.modelExists.mockResolvedValue(null);
    await expect(service.create(dto as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate plate', async () => {
    repo.findByPlate.mockResolvedValue({ id: 9 });
    await expect(service.create(dto as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a vehicle and formats date columns', async () => {
    repo.findByPlate.mockResolvedValue(null);
    repo.create.mockResolvedValue(buildVehicle());
    const result = await service.create(dto as never);
    expect(result).toMatchObject({ plateNumber: 'L 1234 AB', registrationExpiry: '2027-01-01' });
  });

  describe('update', () => {
    it('rejects rolling the odometer backwards', async () => {
      repo.findById.mockResolvedValue(buildVehicle({ currentOdometer: 100000 }));
      await expect(service.update(1, { currentOdometer: 99999 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('allows a forward odometer reading', async () => {
      repo.findById.mockResolvedValue(buildVehicle({ currentOdometer: 100000 }));
      repo.update.mockResolvedValue(buildVehicle({ currentOdometer: 100500 }));
      await expect(service.update(1, { currentOdometer: 100500 })).resolves.toMatchObject({
        currentOdometer: 100500,
      });
    });

    it('404s an unknown vehicle', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(1, { notes: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('soft-deletes a vehicle', async () => {
    repo.findById.mockResolvedValue(buildVehicle());
    repo.softDelete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({ message: 'Kendaraan telah dihapus.' });
  });
});
