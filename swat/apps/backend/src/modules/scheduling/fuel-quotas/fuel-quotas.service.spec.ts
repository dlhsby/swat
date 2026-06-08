import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FuelQuotaStatus } from '@prisma/client';

import { type FuelQuotasRepository } from './fuel-quotas.repository';
import { FuelQuotasService } from './fuel-quotas.service';

function buildQuota(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 42n,
    code: 'KT-202606-0042',
    vehicleId: 1,
    siteId: 2,
    status: FuelQuotaStatus.ACTIVE,
    issuedAt: new Date('2026-06-01T00:00:00Z'),
    validFrom: new Date('2026-06-01T00:00:00Z'),
    validTo: new Date('2026-06-30T00:00:00Z'),
    vehicle: { id: 1, plateNumber: 'L 1 AB' },
    site: { id: 2, name: 'SPBU' },
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('FuelQuotasService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    vehicleExists: jest.Mock;
    siteExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let service: FuelQuotasService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      vehicleExists: jest.fn().mockResolvedValue({ id: 1 }),
      siteExists: jest.fn().mockResolvedValue({ id: 2 }),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new FuelQuotasService(repo as unknown as FuelQuotasRepository);
  });

  const dto = {
    vehicleId: 1,
    siteId: 2,
    issuedAt: '2026-06-01',
    validFrom: '2026-06-01',
    validTo: '2026-06-30',
  };

  it('rejects validFrom after validTo', async () => {
    await expect(service.create({ ...dto, validFrom: '2026-07-01' }, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects issuedAt after validTo', async () => {
    await expect(service.create({ ...dto, issuedAt: '2026-07-15' }, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a missing vehicle', async () => {
    repo.vehicleExists.mockResolvedValue(null);
    await expect(service.create(dto, 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a quota and serializes the BigInt id to a string', async () => {
    repo.create.mockResolvedValue(buildQuota());
    const result = await service.create(dto, 7);
    expect(result.id).toBe('42');
    expect(result.validTo).toBe('2026-06-30');
  });

  it('404s an unknown quota', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid id string', async () => {
    await expect(service.getById('not-a-number')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes a quota via status update', async () => {
    repo.findById.mockResolvedValue(buildQuota());
    repo.update.mockResolvedValue(buildQuota({ status: FuelQuotaStatus.INACTIVE }));
    const result = await service.update('42', { status: FuelQuotaStatus.INACTIVE }, 7);
    expect(result.status).toBe(FuelQuotaStatus.INACTIVE);
  });

  it('lists quotas with refs and pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildQuota()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ id: '42', vehiclePlate: 'L 1 AB', siteName: 'SPBU' });
  });

  it('passes the activeOn date filter through to the repository', async () => {
    repo.list.mockResolvedValue({ rows: [], total: 0 });
    await service.list({ page: 1, limit: 20, activeOn: '2026-06-15' });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ activeOn: expect.any(Date) }));
  });

  it('returns a single quota', async () => {
    repo.findById.mockResolvedValue(buildQuota());
    await expect(service.getById('42')).resolves.toMatchObject({
      id: '42',
      code: 'KT-202606-0042',
    });
  });

  it('404s update of an unknown quota', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      service.update('99', { status: FuelQuotaStatus.INACTIVE }, 7),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects extending validTo before validFrom', async () => {
    repo.findById.mockResolvedValue(buildQuota());
    await expect(service.update('42', { validTo: '2026-05-01' }, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
