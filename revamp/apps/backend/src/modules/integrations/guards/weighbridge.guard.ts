import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request, type Response } from 'express';

import { API_KEY_BRAND } from '../../../common/auth/api-key';
import { hasAllPermissions } from '../../../common/auth/permission-matcher';
import { RolePermissionsService } from '../../../common/auth/role-permissions.service';
import { ServiceAccountsService } from '../../service-accounts/service-accounts.service';
import { ApiAuditService } from '../api-audit.service';
import { WEIGHBRIDGE_PERMISSIONS_KEY } from '../decorators/weighbridge-auth.decorator';
import { RateLimitService } from '../rate-limit.service';
import { type ApiPrincipal } from '../types/principal';

/**
 * Single guard for every weighbridge endpoint (Phase 4). Resolves the principal
 * — an interactive operator (OAuth2 bearer / cookie session) OR a machine
 * ServiceAccount API key — then enforces, in order:
 *   1. authentication (401 if no principal resolves),
 *   2. IP allowlist (service accounts with a non-empty allowlist; 403),
 *   3. RBAC permission(s) from the route metadata (403),
 *   4. per-principal rate limit (429 + `Retry-After`).
 *
 * The resolved principal is attached to `req.principal` for the API-audit
 * interceptor and handlers.
 */
@Injectable()
export class WeighbridgeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly serviceAccounts: ServiceAccountsService,
    private readonly rolePermissions: RolePermissionsService,
    private readonly rateLimit: RateLimitService,
    private readonly apiAudit: ApiAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    try {
      await this.authorize(context, request, response);
      return true;
    } catch (err) {
      // A guard rejection short-circuits before the audit interceptor runs, so
      // record the rejected attempt here (invalid key, IP block, 403, 429). Only
      // audit when a credential was actually presented: blank unauthenticated
      // probes hit before the rate limiter (routes are @Public), so auditing them
      // would let an anonymous flood grow the audit table unbounded (disk DoS).
      if (err instanceof HttpException && this.hasCredential(request)) {
        await this.apiAudit.logRejection(request, err.getStatus());
      }
      throw err;
    }
  }

  /** True when the request carried a credential (session, bearer, or API key) —
   * i.e. a real auth attempt worth auditing, not an anonymous probe. */
  private hasCredential(request: Request): boolean {
    return (
      Boolean(request.session?.user) ||
      Boolean(request.user) ||
      this.extractApiKey(request) !== null
    );
  }

  private async authorize(
    context: ExecutionContext,
    request: Request,
    response: Response,
  ): Promise<void> {
    const required =
      this.reflector.getAllAndOverride<string[]>(WEIGHBRIDGE_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const principal = await this.resolvePrincipal(request);
    if (!principal) {
      throw new UnauthorizedException('Kredensial integrasi tidak valid.');
    }
    // Object.assign avoids the no-param-reassign lint on a direct `request.principal =`.
    Object.assign(request, { principal });

    if (required.length > 0) {
      const granted = await this.rolePermissions.getPermissionKeys(principal.roleId);
      if (!hasAllPermissions(granted, required)) {
        throw new ForbiddenException('Akses ditolak.');
      }
    }

    const limit = await this.rateLimit.check(principal);
    response.setHeader('X-RateLimit-Limit', limit.limit);
    response.setHeader('X-RateLimit-Remaining', limit.remaining);
    if (!limit.allowed) {
      response.setHeader('Retry-After', limit.retryAfter);
      throw new HttpException('Terlalu banyak permintaan.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Operator first (already authenticated upstream), else a ServiceAccount key. */
  private async resolvePrincipal(request: Request): Promise<ApiPrincipal | null> {
    const user = request.session?.user ?? request.user;
    if (user) {
      return { type: 'USER', id: user.id, name: user.username, roleId: user.roleId };
    }
    const key = this.extractApiKey(request);
    if (!key) {
      return null;
    }
    const account = await this.serviceAccounts.validateApiKey(key);
    if (!account) {
      return null;
    }
    if (account.allowedIPs.length > 0 && !account.allowedIPs.includes(clientIp(request))) {
      throw new ForbiddenException('Alamat IP tidak diizinkan untuk akun layanan ini.');
    }
    return {
      type: 'SERVICE_ACCOUNT',
      id: account.id,
      name: account.name,
      roleId: account.roleId,
      rateLimitPerMin: account.rateLimitPerMin,
    };
  }

  /** Read the key from `X-API-Key`, or from a `swatwb_`-branded Bearer token. A
   * JWT bearer is ignored here — it is resolved to `req.user` by the upstream
   * middleware, so only branded keys reach this path. */
  private extractApiKey(request: Request): string | null {
    const headerKey = request.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) {
      return headerKey;
    }
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      if (token.startsWith(API_KEY_BRAND)) {
        return token;
      }
    }
    return null;
  }
}

/** Best-effort client IP (respects Express `trust proxy` via `req.ip`). */
function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? '';
}
