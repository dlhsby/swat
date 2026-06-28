import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declares the permission key(s) a route requires. The {@link PermissionsGuard}
 * enforces AND semantics: the caller's role must satisfy every listed key.
 *
 * @example
 * ```ts
 * @RequirePermissions('vehicle:create')
 * @Post()
 * create() {}
 * ```
 */
export const RequirePermissions = (...keys: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, keys);
