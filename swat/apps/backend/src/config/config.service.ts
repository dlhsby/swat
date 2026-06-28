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

  /**
   * GPS.id webhook + ingestion settings (Phase 7). `webhookToken` is undefined
   * when unset (dev/test) — the webhook guard then rejects every call rather than
   * accepting an unauthenticated ingress. `allowedIps` is the parsed, trimmed,
   * non-empty allowlist (empty array → allow any source, rely on the token).
   */
  get gps(): {
    webhookToken: string | undefined;
    allowedIps: readonly string[];
    ingestRateLimitPerMin: number;
    deviceOfflineMinutes: number;
  } {
    return {
      webhookToken: this.get('GPS_WEBHOOK_TOKEN'),
      allowedIps: this.get('GPS_WEBHOOK_ALLOWED_IPS')
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0),
      ingestRateLimitPerMin: this.get('GPS_INGEST_RATE_LIMIT_PER_MIN'),
      deviceOfflineMinutes: this.get('GPS_DEVICE_OFFLINE_MINUTES'),
    };
  }

  /** Server-side Directions key for snapping the auto-default corridor (optional). */
  get googleMapsServerKey(): string | undefined {
    return this.get('GOOGLE_MAPS_SERVER_KEY');
  }

  /**
   * GPS.id pull-API credentials (Phase 7, nightly batch). Returns null when any
   * credential is missing so callers fail loudly ("pull API not configured")
   * instead of issuing an unauthenticated request. Never hardcode these.
   */
  get gpsidPullCredentials(): { baseUrl: string; username: string; password: string } | null {
    const baseUrl = this.get('GPSID_BASE_URL');
    const username = this.get('GPSID_USERNAME');
    const password = this.get('GPSID_PASSWORD');
    if (!baseUrl || !username || !password) {
      return null;
    }
    return { baseUrl, username, password };
  }
}
