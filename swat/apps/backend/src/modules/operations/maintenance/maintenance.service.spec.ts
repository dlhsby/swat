import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, MaintenanceType } from '@prisma/client';

import { type SessionUser } from '../../../common/auth/session.types';
import { type AuditService } from '../../audit/audit.service';

import { type MaintenanceRepository } from './maintenance.repository';
import { MaintenanceService } from './maintenance.service';

const APPROVER: SessionUser = {
  id: 'user-7',
  username: 'spv',
  roleId: 'role-2',
  mustChangePassword: false,
};

function buildRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'PRW-202606-0001',
    vehicleId: 'vehicle-1',
    type: MaintenanceType.SERVICE,
    status: MaintenanceStatus.PENDING_APPROVAL,
    date: new Date('2026-06-08T00:00:00Z'),
    odometer: 12000,
    workshop: 'Bengkel A',
    description: 'Servis berkala',
    totalCost: 150000,
    notes: null,
    vehicle: { id: 'vehicle-1', plateNumber: 'L 1 AB', model: { brand: 'Hino' } },
    items: [
      { id: 'item-20', name: 'Oli', qty: 2, unitPrice: 50000, totalPrice: 100000 },
      { id: 'item-21', name: 'Filter', qty: 1, unitPrice: 50000, totalPrice: 50000 },
    ],
    createdAt: new Date('2026-06-08T00:00:00Z'),
    updatedAt: new Date('2026-06-08T00:00:00Z'),
    ...overrides,
  };
}

describe('MaintenanceService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    vehicleExists: jest.Mock;
    countByCodePrefix: jest.Mock;
    sumCost: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: MaintenanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      vehicleExists: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
      countByCodePrefix: jest.fn().mockResolvedValue(0),
      sumCost: jest.fn(),
      create: jest.fn().mockImplementation((data) => buildRecord({ totalCost: data.totalCost })),
      update: jest.fn().mockResolvedValue(buildRecord()),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new MaintenanceService(
      repo as unknown as MaintenanceRepository,
      audit as unknown as AuditService,
    );
  });

  const dto = {
    vehicleId: 'vehicle-1',
    type: MaintenanceType.SERVICE,
    date: '2026-06-08',
    items: [
      { name: 'Oli', qty: 2, unitPrice: 50000 },
      { name: 'Filter', qty: 1, unitPrice: 50000 },
    ],
  };

  it('rejects a missing vehicle', async () => {
    repo.vehicleExists.mockResolvedValue(null);
    await expect(service.create(dto, 'user-7')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes totalCost from items and generates a monthly code', async () => {
    repo.countByCodePrefix.mockResolvedValue(41);
    await service.create(dto, 'user-7');
    const arg = repo.create.mock.calls[0][0];
    expect(arg.totalCost).toBe(150000);
    expect(arg.code).toBe('PRW-202606-0042');
    expect(arg.items.create[0]).toMatchObject({ name: 'Oli', totalPrice: 100000 });
  });

  it('handles a record with no items (totalCost 0)', async () => {
    await service.create({ ...dto, items: [] }, 'user-7');
    expect(repo.create.mock.calls[0][0].totalCost).toBe(0);
  });

  it('passes through optional header fields on create', async () => {
    await service.create(
      { ...dto, odometer: 12000, workshop: 'Bengkel A', description: 'Servis', notes: 'catatan' },
      'user-7',
    );
    expect(repo.create.mock.calls[0][0]).toMatchObject({
      odometer: 12000,
      workshop: 'Bengkel A',
      description: 'Servis',
      notes: 'catatan',
    });
  });

  it('updates header fields without touching items when items omitted', async () => {
    repo.findById.mockResolvedValue(buildRecord());
    await service.update(
      '550e8400-e29b-41d4-a716-446655440000',
      { workshop: 'Bengkel B', odometer: 13000 },
      'user-7',
    );
    const arg = repo.update.mock.calls[0][1];
    expect(arg).toMatchObject({ workshop: 'Bengkel B', odometer: 13000 });
    expect(arg.items).toBeUndefined();
    expect(arg.totalCost).toBeUndefined();
  });

  it('404s an unknown record', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('550e8400-e29b-41d4-a716-446655440099')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('approves a pending record', async () => {
    repo.findById.mockResolvedValue(buildRecord());
    repo.update.mockResolvedValue(buildRecord({ status: MaintenanceStatus.APPROVED }));
    const result = await service.approve('550e8400-e29b-41d4-a716-446655440000', APPROVER);
    expect(result.status).toBe(MaintenanceStatus.APPROVED);
    expect(repo.update.mock.calls[0][1]).toMatchObject({ status: MaintenanceStatus.APPROVED });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'maintenance.approve', entityType: 'MaintenanceRecord' }),
    );
  });

  it('rejects approving an already-approved record', async () => {
    repo.findById.mockResolvedValue(buildRecord({ status: MaintenanceStatus.APPROVED }));
    await expect(
      service.approve('550e8400-e29b-41d4-a716-446655440000', APPROVER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recomputes totalCost when items change on update', async () => {
    repo.findById.mockResolvedValue(buildRecord());
    await service.update(
      '550e8400-e29b-41d4-a716-446655440000',
      { items: [{ name: 'Ban', qty: 4, unitPrice: 600000 }] },
      'user-7',
    );
    const arg = repo.update.mock.calls[0][1];
    expect(arg.totalCost).toBe(2400000);
    expect(arg.items.deleteMany).toEqual({});
  });

  it('blocks updating an approved record', async () => {
    repo.findById.mockResolvedValue(buildRecord({ status: MaintenanceStatus.APPROVED }));
    await expect(
      service.update('550e8400-e29b-41d4-a716-446655440000', { notes: 'x' }, 'user-7'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deleting an approved record', async () => {
    repo.findById.mockResolvedValue(buildRecord({ status: MaintenanceStatus.APPROVED }));
    await expect(service.remove('550e8400-e29b-41d4-a716-446655440000')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes a pending record', async () => {
    repo.findById.mockResolvedValue(buildRecord());
    await service.remove('550e8400-e29b-41d4-a716-446655440000');
    expect(repo.delete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
  });

  it('lists with pagination meta and serialized ids', async () => {
    repo.list.mockResolvedValue({ rows: [buildRecord()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'PRW-202606-0001',
      totalCost: 150000,
    });
  });
});
