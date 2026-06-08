import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FuelQuotaStatus } from '@prisma/client';

import { BulkImportStrategy } from './dto/bulk-import-fuel-quotas.dto';
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
    allVehicleIds: jest.Mock;
    allSiteIds: jest.Mock;
    existingLegacyIds: jest.Mock;
    upsertByLegacyId: jest.Mock;
    createPlain: jest.Mock;
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
      allVehicleIds: jest.fn().mockResolvedValue(new Set([1, 2])),
      allSiteIds: jest.fn().mockResolvedValue(new Set([2, 3])),
      existingLegacyIds: jest.fn().mockResolvedValue(new Set()),
      upsertByLegacyId: jest.fn().mockResolvedValue(undefined),
      createPlain: jest.fn().mockResolvedValue(undefined),
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

  describe('bulkImport', () => {
    const row = {
      vehicleId: 1,
      siteId: 2,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    };

    it('creates new rows without a legacyId', async () => {
      const result = await service.bulkImport({ rows: [row] }, 7);
      expect(result).toMatchObject({ total: 1, imported: 1, updated: 0, errorCount: 0 });
      expect(repo.createPlain).toHaveBeenCalledTimes(1);
    });

    it('reports unknown vehicle/site with the 1-based row number', async () => {
      const result = await service.bulkImport(
        {
          rows: [
            { ...row, vehicleId: 99 },
            { ...row, siteId: 88 },
          ],
        },
        7,
      );
      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([
        { row: 1, reason: expect.stringContaining('Kendaraan') },
        { row: 2, reason: expect.stringContaining('Lokasi') },
      ]);
    });

    it('rejects validFrom after validTo', async () => {
      const result = await service.bulkImport(
        { rows: [{ ...row, validFrom: '2026-12-31', validTo: '2026-01-01' }] },
        7,
      );
      expect(result.errorCount).toBe(1);
      expect(result.errors[0]?.reason).toContain('Berlaku dari');
    });

    it('skips existing legacyIds under the SKIP strategy', async () => {
      repo.existingLegacyIds.mockResolvedValue(new Set([500]));
      const result = await service.bulkImport(
        { strategy: BulkImportStrategy.SKIP, rows: [{ ...row, legacyId: 500 }] },
        7,
      );
      expect(result).toMatchObject({ skipped: 1, updated: 0, imported: 0 });
      expect(repo.upsertByLegacyId).not.toHaveBeenCalled();
    });

    it('upserts existing legacyIds under the UPSERT strategy', async () => {
      repo.existingLegacyIds.mockResolvedValue(new Set([500]));
      const result = await service.bulkImport(
        { strategy: BulkImportStrategy.UPSERT, rows: [{ ...row, legacyId: 500 }] },
        7,
      );
      expect(result).toMatchObject({ updated: 1, imported: 0, skipped: 0 });
      expect(repo.upsertByLegacyId).toHaveBeenCalledWith(
        500,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('treats an in-batch duplicate of a new legacyId as an upsert, not a 409', async () => {
      const result = await service.bulkImport(
        {
          strategy: BulkImportStrategy.UPSERT,
          rows: [
            { ...row, legacyId: 900 },
            { ...row, legacyId: 900 },
          ],
        },
        7,
      );
      // First row creates (imported); the second sees it as existing → upsert.
      expect(result).toMatchObject({ imported: 1, updated: 1, errorCount: 0 });
      expect(repo.createPlain).toHaveBeenCalledTimes(1);
      expect(repo.upsertByLegacyId).toHaveBeenCalledTimes(1);
    });

    it('skips an in-batch duplicate of a new legacyId under the SKIP strategy', async () => {
      const result = await service.bulkImport(
        {
          strategy: BulkImportStrategy.SKIP,
          rows: [
            { ...row, legacyId: 901 },
            { ...row, legacyId: 901 },
          ],
        },
        7,
      );
      expect(result).toMatchObject({ imported: 1, skipped: 1, errorCount: 0 });
    });
  });
});
