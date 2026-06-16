import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DisposalPermitStatus } from '@prisma/client';

import { type ActorNamesService } from '../../audit/actor-names.service';

import { type DisposalPermitsRepository } from './disposal-permits.repository';
import { DisposalPermitsService } from './disposal-permits.service';
import { BulkImportStrategy } from './dto/bulk-import-disposal-permits.dto';

function buildPermit(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-0000-0000-000000000042',
    code: 'KT-202606-0042',
    vehicleId: '00000000-0000-0000-0000-000000000001',
    siteId: '00000000-0000-0000-0000-000000000002',
    status: DisposalPermitStatus.ACTIVE,
    issuedAt: new Date('2026-06-01T00:00:00Z'),
    validFrom: new Date('2026-06-01T00:00:00Z'),
    validTo: new Date('2026-06-30T00:00:00Z'),
    vehicle: { id: '00000000-0000-0000-0000-000000000001', plateNumber: 'L 1 AB' },
    site: { id: '00000000-0000-0000-0000-000000000002', name: 'SPBU' },
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('DisposalPermitsService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    vehicleExists: jest.Mock;
    siteExists: jest.Mock;
    create: jest.Mock;
    maxCodeForPrefix: jest.Mock;
    update: jest.Mock;
    allVehicleIds: jest.Mock;
    allSiteIds: jest.Mock;
    existingLegacyIds: jest.Mock;
    upsertByLegacyId: jest.Mock;
    createPlain: jest.Mock;
  };
  let service: DisposalPermitsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      vehicleExists: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }),
      siteExists: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' }),
      create: jest.fn(),
      maxCodeForPrefix: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      allVehicleIds: jest
        .fn()
        .mockResolvedValue(
          new Set(['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']),
        ),
      allSiteIds: jest
        .fn()
        .mockResolvedValue(
          new Set(['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003']),
        ),
      existingLegacyIds: jest.fn().mockResolvedValue(new Set()),
      upsertByLegacyId: jest.fn().mockResolvedValue(undefined),
      createPlain: jest.fn().mockResolvedValue(undefined),
    };
    service = new DisposalPermitsService(
      repo as unknown as DisposalPermitsRepository,
      {
        attach: async (_r: unknown, d: unknown[]) => d,
        resolve: async () => new Map<string, string>(),
      } as unknown as ActorNamesService,
    );
  });

  const dto = {
    vehicleId: '00000000-0000-0000-0000-000000000001',
    siteId: '00000000-0000-0000-0000-000000000002',
    issuedAt: '2026-06-01',
    validFrom: '2026-06-01',
    validTo: '2026-06-30',
  };

  it('rejects validFrom after validTo', async () => {
    await expect(service.create({ ...dto, validFrom: '2026-07-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects issuedAt after validTo', async () => {
    await expect(service.create({ ...dto, issuedAt: '2026-07-15' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a missing vehicle', async () => {
    repo.vehicleExists.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a permit and returns the id as a string', async () => {
    repo.create.mockResolvedValue(buildPermit());
    const result = await service.create(dto);
    expect(result.id).toBe('00000000-0000-0000-0000-000000000042');
    expect(result.validTo).toBe('2026-06-30');
  });

  it('auto-generates the barcode KT-YYYYMM-NNNN from the issue month', async () => {
    // No existing code for the period → first counter; issuedAt 2026-06-01 → 202606.
    repo.maxCodeForPrefix.mockResolvedValue(null);
    repo.create.mockResolvedValue(buildPermit());
    await service.create(dto);
    expect(repo.maxCodeForPrefix).toHaveBeenCalledWith('KT-202606-');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'KT-202606-0001' }));
  });

  it('continues the per-month counter from the highest existing code', async () => {
    repo.maxCodeForPrefix.mockResolvedValue('KT-202606-0041');
    repo.create.mockResolvedValue(buildPermit());
    await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'KT-202606-0042' }));
  });

  it('404s an unknown permit', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('00000000-0000-0000-0000-000000000099')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('revokes a permit via status update', async () => {
    repo.findById.mockResolvedValue(buildPermit());
    repo.update.mockResolvedValue(buildPermit({ status: DisposalPermitStatus.INACTIVE }));
    const result = await service.update('00000000-0000-0000-0000-000000000042', {
      status: DisposalPermitStatus.INACTIVE,
    });
    expect(result.status).toBe(DisposalPermitStatus.INACTIVE);
  });

  it('lists permits with refs and pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildPermit()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      id: '00000000-0000-0000-0000-000000000042',
      vehiclePlate: 'L 1 AB',
      siteName: 'SPBU',
    });
  });

  it('passes the activeOn date filter through to the repository', async () => {
    repo.list.mockResolvedValue({ rows: [], total: 0 });
    await service.list({ page: 1, limit: 20, activeOn: '2026-06-15' });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ activeOn: expect.any(Date) }));
  });

  it('returns a single permit', async () => {
    repo.findById.mockResolvedValue(buildPermit());
    await expect(service.getById('00000000-0000-0000-0000-000000000042')).resolves.toMatchObject({
      id: '00000000-0000-0000-0000-000000000042',
      code: 'KT-202606-0042',
    });
  });

  it('404s update of an unknown permit', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      service.update('00000000-0000-0000-0000-000000000099', {
        status: DisposalPermitStatus.INACTIVE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects extending validTo before validFrom', async () => {
    repo.findById.mockResolvedValue(buildPermit());
    await expect(
      service.update('00000000-0000-0000-0000-000000000042', { validTo: '2026-05-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('bulkImport', () => {
    const row = {
      vehicleId: '00000000-0000-0000-0000-000000000001',
      siteId: '00000000-0000-0000-0000-000000000002',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    };

    it('creates new rows without a legacyId', async () => {
      const result = await service.bulkImport({ rows: [row] });
      expect(result).toMatchObject({ total: 1, imported: 1, updated: 0, errorCount: 0 });
      expect(repo.createPlain).toHaveBeenCalledTimes(1);
    });

    it('defaults the barcode to the legacy id when no code is given', async () => {
      // Legacy printed JATAHKITIR_ID as the barcode → keep it on import.
      await service.bulkImport({ rows: [{ ...row, legacyId: 3375948 }] });
      expect(repo.createPlain).toHaveBeenCalledWith(
        expect.objectContaining({ code: '3375948', legacyId: 3375948 }),
      );
    });

    it('reports unknown vehicle/site with the 1-based row number', async () => {
      const result = await service.bulkImport({
        rows: [
          { ...row, vehicleId: '00000000-0000-0000-0000-000000000099' },
          { ...row, siteId: '00000000-0000-0000-0000-000000000088' },
        ],
      });
      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([
        { row: 1, reason: expect.stringContaining('Kendaraan') },
        { row: 2, reason: expect.stringContaining('Lokasi') },
      ]);
    });

    it('rejects validFrom after validTo', async () => {
      const result = await service.bulkImport({
        rows: [{ ...row, validFrom: '2026-12-31', validTo: '2026-01-01' }],
      });
      expect(result.errorCount).toBe(1);
      expect(result.errors[0]?.reason).toContain('Berlaku dari');
    });

    it('skips existing legacyIds under the SKIP strategy', async () => {
      repo.existingLegacyIds.mockResolvedValue(new Set([500]));
      const result = await service.bulkImport({
        strategy: BulkImportStrategy.SKIP,
        rows: [{ ...row, legacyId: 500 }],
      });
      expect(result).toMatchObject({ skipped: 1, updated: 0, imported: 0 });
      expect(repo.upsertByLegacyId).not.toHaveBeenCalled();
    });

    it('upserts existing legacyIds under the UPSERT strategy', async () => {
      repo.existingLegacyIds.mockResolvedValue(new Set([500]));
      const result = await service.bulkImport({
        strategy: BulkImportStrategy.UPSERT,
        rows: [{ ...row, legacyId: 500 }],
      });
      expect(result).toMatchObject({ updated: 1, imported: 0, skipped: 0 });
      expect(repo.upsertByLegacyId).toHaveBeenCalledWith(
        500,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('treats an in-batch duplicate of a new legacyId as an upsert, not a 409', async () => {
      const result = await service.bulkImport({
        strategy: BulkImportStrategy.UPSERT,
        rows: [
          { ...row, legacyId: 900 },
          { ...row, legacyId: 900 },
        ],
      });
      // First row creates (imported); the second sees it as existing → upsert.
      expect(result).toMatchObject({ imported: 1, updated: 1, errorCount: 0 });
      expect(repo.createPlain).toHaveBeenCalledTimes(1);
      expect(repo.upsertByLegacyId).toHaveBeenCalledTimes(1);
    });

    it('skips an in-batch duplicate of a new legacyId under the SKIP strategy', async () => {
      const result = await service.bulkImport({
        strategy: BulkImportStrategy.SKIP,
        rows: [
          { ...row, legacyId: 901 },
          { ...row, legacyId: 901 },
        ],
      });
      expect(result).toMatchObject({ imported: 1, skipped: 1, errorCount: 0 });
    });
  });

  describe('bulkIssue', () => {
    it('issues N permits and returns all of them with printable fields', async () => {
      let n = 0;
      repo.create.mockImplementation(() =>
        Promise.resolve(buildPermit({ id: `id-${(n += 1)}`, code: `KT-202606-000${n}` })),
      );
      const result = await service.bulkIssue({
        vehicleId: '00000000-0000-0000-0000-000000000001',
        siteId: '00000000-0000-0000-0000-000000000002',
        validFrom: '2026-06-01',
        validTo: '2026-06-30',
        count: 3,
      });
      expect(result).toHaveLength(3);
      expect(repo.create).toHaveBeenCalledTimes(3);
      expect(result.map((p) => p.code)).toEqual([
        'KT-202606-0001',
        'KT-202606-0002',
        'KT-202606-0003',
      ]);
      expect(result[0]).toMatchObject({ vehiclePlate: 'L 1 AB', siteName: 'SPBU' });
    });
  });
});
