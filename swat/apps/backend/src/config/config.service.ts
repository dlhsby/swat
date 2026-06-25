import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

import type { Env } from './env.validation';

/**
 * Typed application configuration. Wraps `@nestjs/config` so the rest of the
 * codebase consumes strongly-typed getters instead of stringly-typed
 * `process.env` lookups. All values are validated at boot (see
 * `env.validation.ts`).
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: NestConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.get('BE_PORT');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get sessionSecret(): string {
    return this.get('SESSION_SECRET');
  }

  get jwtSecret(): string {
    return this.get('JWT_SECRET');
  }

  /** Cookie `Domain` for the session cookie; `undefined` → host-only (default). */
  get sessionCookieDomain(): string | undefined {
    return this.get('SESSION_COOKIE_DOMAIN');
  }

  /** Cookie `SameSite` policy for the session cookie (default `strict`). */
  get sessionCookieSameSite(): Env['SESSION_COOKIE_SAMESITE'] {
    return this.get('SESSION_COOKIE_SAMESITE');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL');
  }

  get storage(): {
    endpoint: string;
    region: string;
    bucket: string;
    reportsBucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
    useInstanceRole: boolean;
  } {
    return {
      endpoint: this.get('S3_ENDPOINT'),
      region: this.get('S3_REGION'),
      bucket: this.get('S3_BUCKET'),
      reportsBucket: this.get('S3_REPORTS_BUCKET'),
      accessKey: this.get('S3_ACCESS_KEY'),
      secretKey: this.get('S3_SECRET_KEY'),
      forcePathStyle: this.get('S3_FORCE_PATH_STYLE'),
      useInstanceRole: this.get('S3_USE_INSTANCE_ROLE'),
    };
  }

  /** Per-minute rate limit for a USER principal on the weighbridge API (Phase 4). */
  get weighbridgeRateLimitPerMin(): number {
    return this.get('WEIGHBRIDGE_RATE_LIMIT_PER_MIN');
  }
}
