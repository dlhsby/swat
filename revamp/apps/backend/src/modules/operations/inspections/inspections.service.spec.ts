import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InspectionItemStatus, InspectionResult } from '@prisma/client';

import { type InspectionsRepository } from './inspections.repository';
import { InspectionsService, deriveInspectionResult } from './inspections.service';

function buildInspection(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'inspection-7',
    vehicleId: 'vehicle-1',
    date: new Date('2026-06-08T00:00:00Z'),
    inspectorId: 'user-3',
    result: InspectionResult.PASS,
    passedCount: 2,
    totalCount: 2,
    notes: null,
    vehicle: { id: 'vehicle-1', plateNumber: 'L 1 AB', model: { brand: 'Hino' } },
    inspector: { id: 'user-3', name: 'Budi' },
    items: [
      { id: 'item-10', label: 'Rem', status: InspectionItemStatus.OK, notes: null },
      { id: 'item-11', label: 'Lampu', status: InspectionItemStatus.OK, notes: null },
    ],
    createdAt: new Date('2026-06-08T00:00:00Z'),
    updatedAt: new Date('2026-06-08T00:00:00Z'),
    ...overrides,
  };
}

describe('deriveInspectionResult', () => {
  it('returns PASS when all items are OK', () => {
    const r = deriveInspectionResult([
      { status: InspectionItemStatus.OK },
      { status: InspectionItemStatus.OK },
    ]);
    expect(r).toEqual({ result: InspectionResult.PASS, passedCount: 2, totalCount: 2 });
  });

  it('returns ATTENTION when any item is ATTENTION (and none FAIL)', () => {
    const r = deriveInspectionResult([
      { status: InspectionItemStatus.OK },
      { status: InspectionItemStatus.ATTENTION },
    ]);
    expect(r).toEqual({ result: InspectionResult.ATTENTION, passedCount: 1, totalCount: 2 });
  });

  it('returns FAIL when any item FAILs, even alongside ATTENTION', () => {
    const r = deriveInspectionResult([
      { status: InspectionItemStatus.ATTENTION },
      { status: InspectionItemStatus.FAIL },
      { status: InspectionItemStatus.OK },
    ]);
    expect(r).toEqual({ result: InspectionResult.FAIL, passedCount: 1, totalCount: 3 });
  });
});

describe('InspectionsService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    vehicleExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: InspectionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      vehicleExists: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
      create: jest.fn().mockImplementation((data) => buildInspection({ result: data.result })),
      update: jest.fn().mockResolvedValue(buildInspection()),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    service = new InspectionsService(repo as unknown as InspectionsRepository);
  });

  const dto = { vehicleId: 'vehicle-1', date: '2026-06-08' };

  it('rejects a missing vehicle', async () => {
    repo.vehicleExists.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('materializes the 12-item template when no items are supplied', async () => {
    await service.create(dto);
    const arg = repo.create.mock.calls[0][0];
    expect(arg.items.create).toHaveLength(12);
    expect(arg.totalCount).toBe(12);
    expect(arg.result).toBe(InspectionResult.PASS);
  });

  it('derives FAIL from supplied items', async () => {
    await service.create({ ...dto, items: [{ label: 'Rem', status: InspectionItemStatus.FAIL }] });
    const arg = repo.create.mock.calls[0][0];
    expect(arg.result).toBe(InspectionResult.FAIL);
    expect(arg.passedCount).toBe(0);
  });

  it('passes scalar FKs (no relation connect) + notes on create', async () => {
    await service.create({ ...dto, inspectorId: 'user-3', notes: 'periksa ulang' });
    const arg = repo.create.mock.calls[0][0];
    expect(arg.notes).toBe('periksa ulang');
    // Scalar FKs so the audit middleware can stamp createdById/updatedById.
    expect(arg.vehicleId).toBe('vehicle-1');
    expect(arg.inspectorId).toBe('user-3');
    expect(arg.vehicle).toBeUndefined();
    expect(arg.createdBy).toBeUndefined();
  });

  it('serializes ids to strings on read', async () => {
    repo.findById.mockResolvedValue(buildInspection());
    const result = await service.getById('inspection-7');
    expect(result.id).toBe('inspection-7');
    expect(result.items[0]?.id).toBe('item-10');
    expect(result.vehicleBrand).toBe('Hino');
  });

  it('404s an unknown inspection', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('inspection-99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaces items and re-derives result on update', async () => {
    repo.findById.mockResolvedValue(buildInspection());
    await service.update('inspection-7', {
      items: [{ label: 'Ban', status: InspectionItemStatus.ATTENTION }],
    });
    const arg = repo.update.mock.calls[0][1];
    expect(arg.result).toBe(InspectionResult.ATTENTION);
    expect(arg.items.deleteMany).toEqual({});
    expect(arg.items.create).toHaveLength(1);
  });

  it('404s update of an unknown inspection', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('inspection-99', { notes: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists with pagination meta', async () => {
    repo.list.mockResolvedValue({ rows: [buildInspection()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ id: 'inspection-7', vehiclePlate: 'L 1 AB' });
  });

  it('deletes an existing inspection', async () => {
    repo.findById.mockResolvedValue(buildInspection());
    await service.remove('inspection-7');
    expect(repo.delete).toHaveBeenCalledWith('inspection-7');
  });

  it('404s delete of an unknown inspection', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove('inspection-99')).rejects.toBeInstanceOf(NotFoundException);
  });
});
