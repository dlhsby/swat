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

  it('queries the permission KEYS (not ids) and caches on a miss', async () => {
    cache.get.mockResolvedValue(null);
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: { key: 'user:read' } },
      { permission: { key: 'vehicle:read' } },
    ]);

    const keys = await service.getPermissionKeys('00000000-0000-0000-0000-0000000000b7');

    // Must be human-readable keys — the nav filter + permissions guard match on
    // these, NOT the permission UUIDs (regression: empty sidebar / "akses ditolak").
    expect(keys).toEqual(['user:read', 'vehicle:read']);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledWith({
      where: { roleId: '00000000-0000-0000-0000-0000000000b7' },
      select: { permission: { select: { key: true } } },
    });
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
