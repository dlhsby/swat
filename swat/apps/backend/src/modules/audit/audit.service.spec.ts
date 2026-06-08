import { type PrismaService } from '../prisma/prisma.service';

import { AuditService } from './audit.service';

describe('AuditService', () => {
  let prisma: { auditLog: { create: jest.Mock } };
  let service: AuditService;

  beforeEach(() => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
    service = new AuditService(prisma as unknown as PrismaService);
  });

  it('persists an audit row with stringified entity id and slim actor', async () => {
    await service.record({
      actor: { id: 3, username: 'admin' },
      action: 'user.create',
      entityType: 'User',
      entityId: 42n,
      details: 'created',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 3,
        actorName: 'admin',
        action: 'user.create',
        entityType: 'User',
        entityId: '42',
        details: 'created',
      }),
    });
  });

  it('defaults a missing actor id to null and details to null', async () => {
    await service.record({
      actor: { username: 'system' },
      action: 'role.update',
      entityType: 'Role',
      entityId: 1,
    });

    const { data } = prisma.auditLog.create.mock.calls[0][0];
    expect(data.actorId).toBeNull();
    expect(data.details).toBeNull();
  });

  it('truncates over-long fields to their column widths', async () => {
    await service.record({
      actor: { id: 1, username: 'x'.repeat(200) },
      action: 'a'.repeat(100),
      entityType: 'e'.repeat(100),
      entityId: 'i'.repeat(100),
      details: 'd'.repeat(1000),
    });

    const { data } = prisma.auditLog.create.mock.calls[0][0];
    expect(data.actorName).toHaveLength(100);
    expect(data.action).toHaveLength(64);
    expect(data.entityType).toHaveLength(48);
    expect(data.entityId).toHaveLength(64);
    expect(data.details).toHaveLength(512);
  });

  it('never throws when the write fails (audit must not break the request)', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      service.record({
        actor: { id: 1, username: 'admin' },
        action: 'trip.verify',
        entityType: 'Trip',
        entityId: 9n,
      }),
    ).resolves.toBeUndefined();
  });
});
