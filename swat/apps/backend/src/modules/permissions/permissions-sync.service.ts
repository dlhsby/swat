import { Injectable, Logger } from '@nestjs/common';

import { PERMISSION_CATALOG } from '../../common/auth/permission-catalog';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reconciles the `permission` table against the code-defined catalog
 * ({@link PERMISSION_CATALOG}). Upserts every catalog key (creating missing rows,
 * refreshing descriptions) and NEVER deletes rows or touches `role_permission` —
 * so adding a permission in code is safe against existing custom roles and their
 * grants. This is the supported way to propagate a new screen's permission to a
 * running database without a full reseed.
 */
@Injectable()
export class PermissionsSyncService {
  private readonly logger = new Logger(PermissionsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
