import {
  ForbiddenException,
  HttpException,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { type AppConfigService } from '../../../config/config.service';
import { type CacheService } from '../../cache/cache.service';
import { type ApiAuditService } from '../api-audit.service';

import { GpsWebhookGuard } from './gps-webhook.guard';

const TOKEN = 'a-long-enough-gps-webhook-token';

function makeContext(
  token: string,
  ip = '203.0.113.10',
): { ctx: ExecutionContext; headers: Record<string, unknown> } {
  const request = { params: { token }, ip, method: 'POST', socket: {}, headers: {} };
  const headers: Record<string, unknown> = {};
  const response = {
    setHeader: (k: string, v: unknown) => {
      headers[k] = v;
    },
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
  return { ctx, headers };
}

describe('GpsWebhookGuard', () => {
  let config: {
    gps: { webhookToken?: string; allowedIps: string[]; ingestRateLimitPerMin: number };
  };
  let cache: { increment: jest.Mock };
  let apiAudit: { logWebhook: jest.Mock };
  let guard: GpsWebhookGuard;

  beforeEach(() => {
    config = { gps: { webhookToken: TOKEN, allowedIps: [], ingestRateLimitPerMin: 600 } };
    cache = { increment: jest.fn().mockResolvedValue(1) };
    apiAudit = { logWebhook: jest.fn().mockResolvedValue(undefined) };
    guard = new GpsWebhookGuard(
      config as unknown as AppConfigService,
      cache as unknown as CacheService,
      apiAudit as unknown as ApiAuditService,
    );
  });

  it('allows a valid token under the rate limit', async () => {
    const { ctx, headers } = makeContext(TOKEN);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(headers['X-RateLimit-Limit']).toBe(600);
    expect(apiAudit.logWebhook).not.toHaveBeenCalled();
  });

  it('rejects + audits a wrong token (401)', async () => {
    const { ctx } = makeContext('wrong-token');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(apiAudit.logWebhook).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects when the server token is unset (webhook disabled)', async () => {
    config.gps.webhookToken = undefined;
    const { ctx } = makeContext(TOKEN);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects + audits a source IP not on the allowlist (403)', async () => {
    config.gps.allowedIps = ['198.51.100.1'];
    const { ctx } = makeContext(TOKEN, '203.0.113.99');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    expect(apiAudit.logWebhook).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows an IP that is on the allowlist', async () => {
    config.gps.allowedIps = ['203.0.113.10'];
    const { ctx } = makeContext(TOKEN, '203.0.113.10');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects + audits when over the rate limit (429 + Retry-After)', async () => {
    cache.increment.mockResolvedValue(601);
    const { ctx, headers } = makeContext(TOKEN);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(headers['Retry-After']).toBe(60);
    expect(apiAudit.logWebhook).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
  });

  it('fails open when Redis is down (increment returns 0)', async () => {
    cache.increment.mockResolvedValue(0);
    const { ctx } = makeContext(TOKEN);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
