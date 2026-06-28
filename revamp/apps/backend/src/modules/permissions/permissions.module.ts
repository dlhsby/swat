import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';

import { PermissionsSyncService } from './permissions-sync.service';

/**
 * Owns the permission-catalog lifecycle. On boot it reconciles the `permission`
 * table against the code-defined catalog (best-effort — a failure is logged but
 * never blocks startup, e.g. while a migration is still in flight). Exported
 * globally so {@link PermissionsSyncService} is injectable by the admin sync
 * endpoint and the seed path.
 */
@Global()
@Module({
  providers: [PermissionsSyncService],
  exports: [PermissionsSyncService],
})
export class PermissionsModule implements OnModuleInit {
  private readonly logger = new Logger(PermissionsModule.name);

  constructor(private readonly sync: PermissionsSyncService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.sync.syncCatalog();
      // Keep the superuser role current so newly-added permissions are usable by
      // admin on the next boot without a reseed.
      await this.sync.ensureSuperuserGrants();
    } catch (err) {
      this.logger.error(
        `Permission catalog sync skipped: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  }
}
