import { type CacheService } from '../../../modules/cache/cache.service';
import { type PrismaService } from '../../../modules/prisma/prisma.service';
import { RolePermissionsService } from '../role-permissions.service';

describe('RolePermissionsService', () => {
  let prisma: { rolePermission: { findMany: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let service: RolePermissionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { rolePermission: { findMany: jest.fn() } };
    cache = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined), del: jest.fn() };
    service = new RolePermissionsService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
    );
  });

  it('returns cached keys without querying the database', async () => {
    cache.get.mockResolvedValue(['user:read']);
    const keys = await service.getPermissionKeys('00000000-0000-0000-0000-0000000000b7');
    expect(keys).toEqual(['user:read']);
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it('queries and caches on a miss', async () => {
    cache.get.mockResolvedValue(null);
    prisma.rolePermission.findMany.mockResolvedValue([
      { permissionId: '00000000-0000-0000-0000-0000000000c1' },
      { permissionId: '00000000-0000-0000-0000-0000000000c2' },
    ]);

    const keys = await service.getPermissionKeys('00000000-0000-0000-0000-0000000000b7');

    expect(keys).toEqual([
      '00000000-0000-0000-0000-0000000000c1',
      '00000000-0000-0000-0000-0000000000c2',
    ]);
    expect(cache.set).toHaveBeenCalledWith(
      'rbac:role:00000000-0000-0000-0000-0000000000b7:permissions',
      keys,
      300,
    );
  });

  it('invalidates the cached set', async () => {
    await service.invalidate('00000000-0000-0000-0000-0000000000b7');
    expect(cache.del).toHaveBeenCalledWith(
      'rbac:role:00000000-0000-0000-0000-0000000000b7:permissions',
    );
  });
});
