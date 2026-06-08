import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmploymentStatus } from '@prisma/client';

import { type DriversRepository } from './drivers.repository';
import { DriversService } from './drivers.service';

function buildDriver(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: 'Budi',
    idCardNumber: '3500000000000001',
    poolSiteId: 1,
    employmentStatus: EmploymentStatus.SATGAS,
    originAddress: 'Surabaya',
    currentAddress: 'Surabaya',
    birthDate: new Date('1990-01-01T00:00:00Z'),
    contact: '0800',
    safetyTraining: 'BELUM',
    notes: null,
    poolSite: { id: 1, name: 'Pool' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('DriversService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByIdCard: jest.Mock;
    siteExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let service: DriversService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByIdCard: jest.fn().mockResolvedValue(null),
      siteExists: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new DriversService(repo as unknown as DriversRepository);
  });

  const dto = {
    poolSiteId: 1,
    employmentStatus: EmploymentStatus.SATGAS,
    name: 'Budi',
    idCardNumber: '3500000000000001',
    originAddress: 'Surabaya',
    currentAddress: 'Surabaya',
    birthDate: '1990-01-01',
    contact: '0800',
  };

  it('rejects an under-18 driver', async () => {
    await expect(service.create({ ...dto, birthDate: '2020-01-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a missing pool site', async () => {
    repo.siteExists.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate KTP', async () => {
    repo.findByIdCard.mockResolvedValue({ id: 9 });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates an adult driver', async () => {
    repo.create.mockResolvedValue(buildDriver());
    await expect(service.create(dto)).resolves.toMatchObject({
      name: 'Budi',
      birthDate: '1990-01-01',
    });
  });

  it('404s an unknown driver', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft-deletes a driver', async () => {
    repo.findById.mockResolvedValue(buildDriver());
    repo.softDelete.mockResolvedValue({ id: 1 });
    await expect(service.remove(1)).resolves.toEqual({ message: 'Pengemudi telah dihapus.' });
  });
});
