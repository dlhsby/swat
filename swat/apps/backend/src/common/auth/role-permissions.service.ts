import { Injectable } from '@nestjs/common';

import { CacheService } from '../../modules/cache/cache.service';
import { PrismaService } from '../../modules/prisma/prisma.service';

const cacheKey = (roleId: string): string => `rbac:role:${roleId}:permissions`;
const CACHE_TTL_SECONDS = 300;

/**
 * Resolves the concrete permission keys granted to a role, cached in Redis so
 * the hot authz path avoids a join on every request. Cache degrades gracefully
 * (a miss simply re-queries). Call {@link invalidate} whenever a role's grants
 * change so the next request reloads.
 */
@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getPermissionKeys(roleId: string): Promise<string[]> {
    const cached = await this.cache.get<string[]>(cacheKey(roleId));
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const keys = rows.map((row) => row.permissionId);

    await this.cache.set(cacheKey(roleId), keys, CACHE_TTL_SECONDS);
    return keys;
  }

  async invalidate(roleId: string): Promise<void> {
    await this.cache.del(cacheKey(roleId));
  }
}
