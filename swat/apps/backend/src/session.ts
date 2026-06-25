import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { RedisStore } from 'connect-redis';
import { type RequestHandler } from 'express';
import session from 'express-session';
import { createClient, type RedisClientType } from 'redis';

import { AppConfigService } from './config';

import './common/auth/session.types';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

/**
 * Lifecycle-managed Redis client dedicated to the session store (connect-redis
 * speaks the node-redis API, so this is distinct from the ioredis client the
 * cache layer uses). Owned by Nest DI so it is quit on shutdown — no leaked
 * handles in tests or on graceful stop.
 */
@Injectable()
export class SessionRedis implements OnModuleDestroy {
  readonly client: RedisClientType;
  private readonly connected: Promise<unknown>;

  constructor(config: AppConfigService) {
    this.client = createClient({ url: config.redisUrl });
    this.client.on('error', () => undefined); // surfaced by the store; never crash the request path
    this.connected = this.client.connect();
  }

  /** Resolves once the client has connected (await before serving traffic). */
  ready(): Promise<unknown> {
    return this.connected;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // already closed
    }
  }
}

/**
 * Build the session middleware. Cookie hardening per specs/06-auth-rbac.md /
 * 07-api-spec.md: httpOnly, SameSite (Strict by default), Secure in production,
 * 8h rolling inactivity window. `domain`/`sameSite` are config-driven so the
 * same image runs same-origin on-prem prod (host-only, Strict) and the AWS
 * staging split (`Domain=.swat.wahyutrip.com`, SameSite=Lax) — see
 * SESSION_COOKIE_DOMAIN / SESSION_COOKIE_SAMESITE.
 */
export function buildSessionMiddleware(
  config: AppConfigService,
  client: RedisClientType,
): RequestHandler {
  const domain = config.sessionCookieDomain;
  return session({
    store: new RedisStore({ client, prefix: 'swat:sess:' }),
    name: 'swat.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: config.sessionCookieSameSite,
      secure: config.isProduction,
      maxAge: EIGHT_HOURS_MS,
      ...(domain ? { domain } : {}),
    },
  });
}
