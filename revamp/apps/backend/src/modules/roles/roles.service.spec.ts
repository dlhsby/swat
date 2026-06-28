import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type RolePermissionsService } from '../../common/auth/role-permissions.service';
import { type AuditActor, type AuditService } from '../audit/audit.service';

import { type RolesRepository, type RoleWithRelations } from './roles.repository';
import { RolesService } from './roles.service';

const actor: AuditActor = { id: '00000000-0000-0000-0000-0000000000a1', username: 'admin' };

function buildRole(overrides: Partial<RoleWithRelations> = {}): RoleWithRelations {
  return {
    id: '00000000-0000-0000-0000-0000000000b1',
    legacyId: null,
    name: 'Checker',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    permissions: [
      { permissionId: '00000000-0000-0000-0000-0000000000c1' },
      { permissionId: '00000000-0000-0000-0000-0000000000c2' },
    ],
    _count: { users: 0 },
    ...overrides,
  } as RoleWithRelations;
}

describe('RolesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByName: jest.Mock;
    permissionsByIds: jest.Mock;
    permissionsForRole: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let rolePermissions: { invalidate: jest.Mock };
  let audit: { record: jest.Mock };
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      permissionsByIds: jest.fn(),
      permissionsForRole: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    rolePermissions = { invalidate: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new RolesService(
      repo as unknown as RolesRepository,
      rolePermissions as unknown as RolePermissionsService,
      audit as unknown as AuditService,
    );
  });

  it('lists roles with permission ids and user counts', async () => {
    repo.list.mockResolvedValue([buildRole({ _count: { users: 3 } })]);
    const result = await service.list();
    expect(result[0]).toMatchObject({
      permissionIds: [
        '00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-0000000000c2',
      ],
      userCount: 3,
    });
  });

  it('returns role detail or 404', async () => {
    repo.findById.mockResolvedValueOnce(buildRole());
    repo.permissionsForRole.mockResolvedValue([
      { id: '00000000-0000-0000-0000-0000000000c1', key: 'trip:read', description: 'view' },
    ]);
    await expect(service.getById('00000000-0000-0000-0000-0000000000b1')).resolves.toMatchObject({
      permissions: [{ key: 'trip:read' }],
    });

    repo.findById.mockResolvedValueOnce(null);
    await expect(service.getById('00000000-0000-0000-0000-0000000000b99')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('create', () => {
    it('rejects a duplicate name', async () => {
      repo.findByName.mockResolvedValue({ id: '00000000-0000-0000-0000-0000000000b2' });
      await expect(
        service.create(
          { name: 'Checker', permissionIds: ['00000000-0000-0000-0000-0000000000c1'] },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects unknown permission ids', async () => {
      repo.findByName.mockResolvedValue(null);
      repo.permissionsByIds.mockResolvedValue([{ id: '00000000-0000-0000-0000-0000000000c1' }]); // only 1 of 2 found
      await expect(
        service.create(
          {
            name: 'New',
            permissionIds: [
              '00000000-0000-0000-0000-0000000000c1',
              '00000000-0000-0000-0000-0000000000c2',
            ],
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a role', async () => {
      repo.findByName.mockResolvedValue(null);
      repo.permissionsByIds.mockResolvedValue([
        { id: '00000000-0000-0000-0000-0000000000c1' },
        { id: '00000000-0000-0000-0000-0000000000c2' },
      ]);
      repo.create.mockResolvedValue(buildRole({ name: 'New' }));
      const result = await service.create(
        {
          name: 'New',
          permissionIds: [
            '00000000-0000-0000-0000-0000000000c1',
            '00000000-0000-0000-0000-0000000000c2',
          ],
        },
        actor,
      );
      expect(result.name).toBe('New');
    });
  });

  describe('update', () => {
    it('404s on a missing role', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update('00000000-0000-0000-0000-0000000000b1', { name: 'X' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a name collision with another role', async () => {
      repo.findById.mockResolvedValue(buildRole({ name: 'Checker' }));
      repo.findByName.mockResolvedValue({ id: '00000000-0000-0000-0000-0000000000b2' });
      await expect(
        service.update('00000000-0000-0000-0000-0000000000b1', { name: 'Supervisor' }, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates grants and invalidates the permission cache', async () => {
      repo.findById.mockResolvedValue(buildRole());
      repo.permissionsByIds.mockResolvedValue([{ id: '00000000-0000-0000-0000-0000000000c3' }]);
      repo.update.mockResolvedValue(
        buildRole({ permissions: [{ permissionId: '00000000-0000-0000-0000-0000000000c3' }] }),
      );
      await service.update(
        '00000000-0000-0000-0000-0000000000b1',
        { permissionIds: ['00000000-0000-0000-0000-0000000000c3'] },
        actor,
      );
      expect(rolePermissions.invalidate).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-0000000000b1',
      );
    });

    it('does not invalidate the cache on a name-only edit', async () => {
      repo.findById.mockResolvedValue(buildRole());
      repo.update.mockResolvedValue(buildRole({ name: 'Renamed' }));
      await service.update('00000000-0000-0000-0000-0000000000b1', { name: 'Renamed' }, actor);
      expect(rolePermissions.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('blocks deletion while users are assigned', async () => {
      repo.findById.mockResolvedValue(buildRole({ _count: { users: 2 } }));
      await expect(
        service.remove('00000000-0000-0000-0000-0000000000b1', actor),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused role and invalidates the cache', async () => {
      repo.findById.mockResolvedValue(buildRole({ _count: { users: 0 } }));
      repo.delete.mockResolvedValue({ id: '00000000-0000-0000-0000-0000000000b1' });
      await expect(service.remove('00000000-0000-0000-0000-0000000000b1', actor)).resolves.toEqual({
        message: 'Peran telah dihapus.',
      });
      expect(rolePermissions.invalidate).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-0000000000b1',
      );
    });
  });
});
