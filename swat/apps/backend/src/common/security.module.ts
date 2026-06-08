import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { RolePermissionsService } from './auth/role-permissions.service';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Registers the global security pipeline: authenticate first ({@link AuthGuard}),
 * then authorize ({@link PermissionsGuard}). Registration order is execution
 * order, so authentication always runs before permission checks. Secure by
 * default — every route requires a session unless marked `@Public`.
 *
 * Exports {@link RolePermissionsService} so feature modules (e.g. roles) can
 * invalidate the cached grants when a role changes.
 */
@Global()
@Module({
  providers: [
    RolePermissionsService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [RolePermissionsService],
})
export class SecurityModule {}
