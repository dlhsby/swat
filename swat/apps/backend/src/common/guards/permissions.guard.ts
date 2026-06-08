import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';

import { hasAllPermissions } from '../auth/permission-matcher';
import { RolePermissionsService } from '../auth/role-permissions.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * Global authorization guard. For routes annotated with `@RequirePermissions`,
 * loads the session user's role permissions (cached) and enforces AND
 * semantics. Routes without the decorator pass through (authentication alone is
 * sufficient).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.session?.user;
    if (!user) {
      throw new UnauthorizedException('Sesi tidak valid atau telah berakhir.');
    }

    const granted = await this.rolePermissions.getPermissionKeys(user.roleId);
    if (!hasAllPermissions(granted, required)) {
      throw new ForbiddenException('Akses ditolak.');
    }
    return true;
  }
}
