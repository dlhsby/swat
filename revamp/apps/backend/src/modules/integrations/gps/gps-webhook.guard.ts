import { timingSafeEqual } from 'node:crypto';

import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request, type Response } from 'express';

import { AppConfigService } from '../../../config/config.service';
import { CacheService } from '../../cache/cache.service';
import { ApiAuditService } from '../api-audit.service';

const RATE_WINDOW_SECONDS = 60;
const WEBHOOK_PRINCIPAL = 'GPS.id Webhook';

/**
 * Secures the vendor-unauthenticated GPS.id webhook (Phase 7, T-705). In order:
 *   1. secret path token (constant-time compare; an UNSET token disables the
 *      webhook entirely rather than accepting an open ingress) → 401,
 *   2. optional source-IP allowlist → 403,
 *   3. per-IP fixed-window rate limit (fail-open if Redis is down) → 429.
 * Every rejection is audited (no UUID principal — machine caller). Treats all
 * inputs as untrusted; the token is never logged.
 */
@Injectable()
export class GpsWebhookGuard implements CanActivate {
  constructor(
    private readonly config: AppConfigService,
    private readonly cache: CacheService,
    private readonly apiAudit: ApiAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    try {
      await this.authorize(request, response);
      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        await this.apiAudit.logWebhook({
          request,
          statusCode: err.getStatus(),
          principalName: WEBHOOK_PRINCIPAL,
        });
      }
      throw err;
    }
  }

  private async authorize(request: Request, response: Response): Promise<void> {
    const { webhookToken, allowedIps, ingestRateLimitPerMin } = this.config.gps;

    // 1. Token. An unset server token means the webhook is not configured →
    //    reject everything (never an open ingress).
    const presented = typeof request.params.token === 'string' ? request.params.token : '';
    if (!webhookToken || !constantTimeEquals(presented, webhookToken)) {
      throw new UnauthorizedException('Token webhook GPS tidak valid.');
    }

    // 2. IP allowlist (empty → allow any source, rely on the token).
    const ip = clientIp(request);
    if (allowedIps.length > 0 && !allowedIps.includes(ip)) {
      throw new ForbiddenException('Alamat IP tidak diizinkan untuk webhook GPS.');
    }

    // 3. Per-IP rate limit. `increment` returns 0 only when Redis is down →
    //    fail-open (availability), surfaced by the count check below.
    const count = await this.cache.increment(`gps:rl:${ip}`, RATE_WINDOW_SECONDS);
    if (count > 0) {
      response.setHeader('X-RateLimit-Limit', ingestRateLimitPerMin);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, ingestRateLimitPerMin - count));
      if (count > ingestRateLimitPerMin) {
        response.setHeader('Retry-After', RATE_WINDOW_SECONDS);
        throw new HttpException('Terlalu banyak permintaan.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }
}

/** Constant-time string compare that is safe for unequal lengths. */
function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a compare against a same-length buffer to avoid a length oracle.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Best-effort client IP (respects Express `trust proxy` via `req.ip`). */
function clientIp(request: Request): string {
  return request.ip ?? request.socket?.remoteAddress ?? '';
}
