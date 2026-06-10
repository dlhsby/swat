import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmploymentStatus } from '@prisma/client';

import { type DriversRepository } from './drivers.repository';
import { DriversService } from './drivers.service';

function buildDriver(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Budi',
    idCardNumber: '3500000000000001',
    poolSiteId: '550e8400-e29b-41d4-a716-446655440002',
    employmentStatus: EmploymentStatus.SATGAS,
    originAddress: 'Surabaya',
    currentAddress: 'Surabaya',
    birthDate: new Date('1990-01-01T00:00:00Z'),
    contact: '0800',
    safetyTraining: 'BELUM',
    notes: null,
    poolSite: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Pool' },
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
      siteExists: jest.fn().mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new DriversService(repo as unknown as DriversRepository);
  });

  const dto = {
    poolSiteId: '550e8400-e29b-41d4-a716-446655440002',
    employmentStatus: EmploymentStatus.SATGAS,
    name: 'Budi',
    idCardNumber: '3500000000000001',
    originAddress: 'Surabaya',
    currentAddress: 'Surabaya',
    birthDate: '1990-01-01',
    contact: '0800',
  };

  it('lists drivers with pagination meta and date formatting', async () => {
    repo.list.mockResolvedValue({ rows: [buildDriver()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ name: 'Budi', birthDate: '1990-01-01' });
  });

  it('returns a single driver', async () => {
    repo.findById.mockResolvedValue(buildDriver());
    await expect(service.getById('550e8400-e29b-41d4-a716-446655440001')).resolves.toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440001',
    });
  });

  describe('create', () => {
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
      repo.findByIdCard.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440099' });
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates an adult driver', async () => {
      repo.create.mockResolvedValue(buildDriver());
      await expect(service.create(dto)).resolves.toMatchObject({
        name: 'Budi',
        birthDate: '1990-01-01',
      });
    });

    it('creates with optional fields set', async () => {
      repo.create.mockResolvedValue(buildDriver());
      await service.create({ ...dto, safetyTraining: 'SUDAH', notes: 'catatan' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ safetyTraining: 'SUDAH', notes: 'catatan' }),
      );
    });
  });

  describe('update', () => {
    it('404s an unknown driver', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440099', { contact: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a missing pool site on update', async () => {
      repo.findById.mockResolvedValue(buildDriver());
      repo.siteExists.mockResolvedValue(null);
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', {
          poolSiteId: '550e8400-e29b-41d4-a716-446655440099',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an under-18 birthDate on update', async () => {
      repo.findById.mockResolvedValue(buildDriver());
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', { birthDate: '2020-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate KTP on update', async () => {
      repo.findById.mockResolvedValue(buildDriver());
      repo.findByIdCard.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440099' });
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', {
          idCardNumber: '3500000000000002',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates a driver', async () => {
      repo.findById.mockResolvedValue(buildDriver());
      repo.update.mockResolvedValue(buildDriver({ currentAddress: 'Sidoarjo' }));
      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', { currentAddress: 'Sidoarjo' }),
      ).resolves.toMatchObject({
        currentAddress: 'Sidoarjo',
      });
    });

    it('updates every field at once', async () => {
      repo.findById.mockResolvedValue(buildDriver());
      repo.update.mockResolvedValue(buildDriver());
      await service.update('550e8400-e29b-41d4-a716-446655440001', {
        poolSiteId: '550e8400-e29b-41d4-a716-446655440010',
        employmentStatus: EmploymentStatus.PNS,
        name: 'Budi Baru',
        idCardNumber: '3500000000000002',
        originAddress: 'Malang',
        currentAddress: 'Sidoarjo',
        birthDate: '1985-05-05',
        contact: '0811',
        safetyTraining: 'SUDAH',
        notes: 'catatan',
      });
      expect(repo.update).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        expect.objectContaining({
          name: 'Budi Baru',
          employmentStatus: EmploymentStatus.PNS,
          poolSite: { connect: { id: '550e8400-e29b-41d4-a716-446655440010' } },
        }),
      );
    });
  });

  describe('remove', () => {
    it('404s an unknown driver', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440099')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('soft-deletes a driver', async () => {
      repo.findById.mockResolvedValue(buildDriver());
      repo.softDelete.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440001' });
      await expect(service.remove('550e8400-e29b-41d4-a716-446655440001')).resolves.toEqual({
        message: 'Pengemudi telah dihapus.',
      });
    });
  });
});
