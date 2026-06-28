import { Injectable, Logger } from '@nestjs/common';

import { PERMISSION_CATALOG } from '../../common/auth/permission-catalog';
import { RolePermissionsService } from '../../common/auth/role-permissions.service';
import { PrismaService } from '../prisma/prisma.service';

/** The superuser role (seed `*:*`); always reconciled to hold every permission. */
const SUPERUSER_ROLE = 'Administrator';

/**
 * Reconciles the `permission` table against the code-defined catalog
 * ({@link PERMISSION_CATALOG}). {@link syncCatalog} upserts every catalog key
 * (creating missing rows, refreshing descriptions) and never deletes rows or
 * touches custom-role grants — so adding a permission in code is safe against
 * existing roles. {@link ensureSuperuserGrants} additionally grants any new
 * permissions to the {@link SUPERUSER_ROLE} role (definitionally `*:*`) so the
 * admin never needs a reseed to use a newly-added screen. Together these are the
 * supported way to propagate a new permission to a running database.
 */
@Injectable()
export class PermissionsSyncService {
  private readonly logger = new Logger(PermissionsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  /** Upsert the catalog into the DB. Returns the number of keys reconciled. */
  async syncCatalog(): Promise<number> {
    for (const entry of PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: { key: entry.key },
        update: { description: entry.description },
        create: { key: entry.key, description: entry.description },
      });
    }
    this.logger.log(`Synced ${PERMISSION_CATALOG.length} permissions from catalog`);
    return PERMISSION_CATALOG.length;
  }

  /**
   * Grant every permission to the superuser role (idempotent, additive only).
   * Busts the role's cached grants when anything new was added. No-op if the role
   * does not exist yet (bare DB before seed). Returns the number of new grants.
   */
  async ensureSuperuserGrants(): Promise<number> {
    const admin = await this.prisma.role.findUnique({
      where: { name: SUPERUSER_ROLE },
      select: { id: true },
    });
    if (!admin) {
      return 0;
    }
    const permissions = await this.prisma.permission.findMany({ select: { id: true } });
    const result = await this.prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: admin.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
    if (result.count > 0) {
      await this.rolePermissions.invalidate(admin.id);
      this.logger.log(`Granted ${result.count} new permission(s) to the ${SUPERUSER_ROLE} role`);
    }
    return result.count;
  }
}
