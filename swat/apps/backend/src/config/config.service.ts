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
  } {
    return {
      endpoint: this.get('S3_ENDPOINT'),
      region: this.get('S3_REGION'),
      bucket: this.get('S3_BUCKET'),
      reportsBucket: this.get('S3_REPORTS_BUCKET'),
      accessKey: this.get('S3_ACCESS_KEY'),
      secretKey: this.get('S3_SECRET_KEY'),
      forcePathStyle: this.get('S3_FORCE_PATH_STYLE'),
    };
  }
}
