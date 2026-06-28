import { PERMISSION_CATALOG } from '../../common/auth/permission-catalog';
import { type RolePermissionsService } from '../../common/auth/role-permissions.service';
import { type PrismaService } from '../prisma/prisma.service';

import { PermissionsSyncService } from './permissions-sync.service';

describe('PermissionsSyncService', () => {
  let prisma: {
    permission: { upsert: jest.Mock; findMany: jest.Mock };
    role: { findUnique: jest.Mock };
    rolePermission: { createMany: jest.Mock };
  };
  let rolePermissions: { invalidate: jest.Mock };
  let service: PermissionsSyncService;

  beforeEach(() => {
    prisma = {
      permission: { upsert: jest.fn().mockResolvedValue({}), findMany: jest.fn() },
      role: { findUnique: jest.fn() },
      rolePermission: { createMany: jest.fn() },
    };
    rolePermissions = { invalidate: jest.fn().mockResolvedValue(undefined) };
    service = new PermissionsSyncService(
      prisma as unknown as PrismaService,
      rolePermissions as unknown as RolePermissionsService,
    );
  });

  it('upserts every catalog key and returns the count', async () => {
    const count = await service.syncCatalog();

    expect(count).toBe(PERMISSION_CATALOG.length);
    expect(prisma.permission.upsert).toHaveBeenCalledTimes(PERMISSION_CATALOG.length);
    const [first] = PERMISSION_CATALOG;
    if (!first) {
      throw new Error('catalog is empty');
    }
    expect(prisma.permission.upsert).toHaveBeenCalledWith({
      where: { key: first.key },
      update: { description: first.description },
      create: { key: first.key, description: first.description },
    });
  });

  describe('ensureSuperuserGrants', () => {
    it('is a no-op when the Administrator role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);
      const count = await service.ensureSuperuserGrants();
      expect(count).toBe(0);
      expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
    });

    it('grants all permissions to admin and busts the cache when new grants are added', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 'admin-role' });
      prisma.permission.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.rolePermission.createMany.mockResolvedValue({ count: 2 });

      const count = await service.ensureSuperuserGrants();

      expect(count).toBe(2);
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'admin-role', permissionId: 'p1' },
          { roleId: 'admin-role', permissionId: 'p2' },
        ],
        skipDuplicates: true,
      });
      expect(rolePermissions.invalidate).toHaveBeenCalledWith('admin-role');
    });

    it('does not bust the cache when nothing new was granted', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 'admin-role' });
      prisma.permission.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.rolePermission.createMany.mockResolvedValue({ count: 0 });

      await service.ensureSuperuserGrants();

      expect(rolePermissions.invalidate).not.toHaveBeenCalled();
    });
  });
});
