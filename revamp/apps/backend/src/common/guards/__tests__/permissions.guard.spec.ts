import { ForbiddenException, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';

import { type RolePermissionsService } from '../../auth/role-permissions.service';
import { PermissionsGuard } from '../permissions.guard';

function contextWith(request: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  function makeGuard(required: string[] | undefined, granted: string[]): PermissionsGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    const rolePermissions = {
      getPermissionKeys: jest.fn().mockResolvedValue(granted),
    } as unknown as RolePermissionsService;
    return new PermissionsGuard(reflector, rolePermissions);
  }

  const session = { session: { user: { id: 1, roleId: 7 } } };

  it('passes through when no permissions are required', async () => {
    await expect(makeGuard(undefined, []).canActivate(contextWith(session))).resolves.toBe(true);
  });

  it('allows when the role satisfies every required key', async () => {
    const guard = makeGuard(['vehicle:create'], ['vehicle:*']);
    await expect(guard.canActivate(contextWith(session))).resolves.toBe(true);
  });

  it('denies when a required key is missing', async () => {
    const guard = makeGuard(['vehicle:delete'], ['vehicle:read']);
    await expect(guard.canActivate(contextWith(session))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets the superuser wildcard satisfy anything', async () => {
    const guard = makeGuard(['user:manage'], ['*:*']);
    await expect(guard.canActivate(contextWith(session))).resolves.toBe(true);
  });

  it('rejects when there is no session user', async () => {
    const guard = makeGuard(['vehicle:read'], []);
    await expect(guard.canActivate(contextWith({ session: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
