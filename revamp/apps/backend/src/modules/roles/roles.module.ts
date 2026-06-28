import { Module } from '@nestjs/common';

import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

/**
 * Roles & permissions module. Permissions are a read-only catalog (seeded);
 * roles are mutable and bind permission grants.
 */
@Module({
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService],
})
export class RolesModule {}
