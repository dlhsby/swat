import {
  ForbiddenException,
  HttpException,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';

import { type RolePermissionsService } from '../../../common/auth/role-permissions.service';
import { type ServiceAccountsService } from '../../service-accounts/service-accounts.service';
import { type ApiAuditService } from '../api-audit.service';
import { type RateLimitService } from '../rate-limit.service';

import { WeighbridgeGuard } from './weighbridge.guard';

function buildContext(request: Record<string, unknown>): {
  ctx: ExecutionContext;
  response: { setHeader: jest.Mock; statusCode: number };
} {
  const response = { setHeader: jest.fn(), statusCode: 200 };
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { ctx, response };
}

describe('WeighbridgeGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let serviceAccounts: { validateApiKey: jest.Mock };
  let rolePermissions: { getPermissionKeys: jest.Mock };
  let rateLimit: { check: jest.Mock };
  let apiAudit: { logRejection: jest.Mock };
  let guard: WeighbridgeGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(['weighbridge:post']) };
    serviceAccounts = { validateApiKey: jest.fn() };
    rolePermissions = { getPermissionKeys: jest.fn().mockResolvedValue(['weighbridge:post']) };
    rateLimit = {
      check: jest
        .fn()
        .mockResolvedValue({ allowed: true, limit: 500, remaining: 499, retryAfter: 60 }),
    };
    apiAudit = { logRejection: jest.fn().mockResolvedValue(undefined) };
    guard = new WeighbridgeGuard(
      reflector as unknown as Reflector,
      serviceAccounts as unknown as ServiceAccountsService,
      rolePermissions as unknown as RolePermissionsService,
      rateLimit as unknown as RateLimitService,
      apiAudit as unknown as ApiAuditService,
    );
  });

  it('allows a session user with the required permission', async () => {
    const request: Record<string, unknown> = {
      session: { user: { id: 'u1', username: 'op', roleId: 'r1' } },
      headers: {},
    };
    const { ctx } = buildContext(request);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.principal).toMatchObject({ type: 'USER', id: 'u1' });
  });

  it('401s a blank probe WITHOUT auditing it (no credential → anti-flood)', async () => {
    const { ctx } = buildContext({ headers: {}, method: 'POST' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(apiAudit.logRejection).not.toHaveBeenCalled();
  });

  it('401s an invalid API key AND audits it (a credential was presented)', async () => {
    serviceAccounts.validateApiKey.mockResolvedValue(null);
    const { ctx } = buildContext({ headers: { 'x-api-key': 'swatwb_bad' }, method: 'POST' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(apiAudit.logRejection).toHaveBeenCalledWith(expect.any(Object), 401);
  });

  it('403s a user lacking the permission', async () => {
    rolePermissions.getPermissionKeys.mockResolvedValue(['weighbridge:read']);
    const { ctx } = buildContext({
      session: { user: { id: 'u1', username: 'op', roleId: 'r1' } },
      headers: {},
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('authenticates a service account via X-API-Key and checks IP allowlist', async () => {
    serviceAccounts.validateApiKey.mockResolvedValue({
      id: 's1',
      name: 'tpa',
      roleId: 'r2',
      rateLimitPerMin: 100,
      allowedIPs: ['10.0.0.5'],
    });
    const request: Record<string, unknown> = {
      headers: { 'x-api-key': 'swatwb_key' },
      ip: '10.0.0.5',
      socket: {},
    };
    const { ctx } = buildContext(request);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.principal).toMatchObject({ type: 'SERVICE_ACCOUNT', id: 's1' });
  });

  it('403s a service account from a disallowed IP', async () => {
    serviceAccounts.validateApiKey.mockResolvedValue({
      id: 's1',
      name: 'tpa',
      roleId: 'r2',
      rateLimitPerMin: 100,
      allowedIPs: ['10.0.0.5'],
    });
    const { ctx } = buildContext({
      headers: { 'x-api-key': 'swatwb_key' },
      ip: '192.168.1.1',
      socket: {},
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('429s when the rate limit is exceeded', async () => {
    rateLimit.check.mockResolvedValue({ allowed: false, limit: 1, remaining: 0, retryAfter: 60 });
    const { ctx, response } = buildContext({
      session: { user: { id: 'u1', username: 'op', roleId: 'r1' } },
      headers: {},
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 60);
  });

  it('ignores a non-branded Bearer token (treated as no key)', async () => {
    const { ctx } = buildContext({
      headers: { authorization: 'Bearer some.jwt.token' },
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(serviceAccounts.validateApiKey).not.toHaveBeenCalled();
  });
});
