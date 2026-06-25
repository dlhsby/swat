import { type ConfigService } from '@nestjs/config';

import { AppConfigService } from './config.service';
import { type Env } from './env.validation';

const ENV: Env = {
  NODE_ENV: 'production',
  BE_PORT: 4000,
  DATABASE_URL: 'postgresql://swat:pw@localhost:5432/swat',
  SESSION_SECRET: 'a-long-enough-session-secret',
  JWT_SECRET: 'a-long-enough-jwt-secret-value',
  SESSION_COOKIE_DOMAIN: undefined,
  SESSION_COOKIE_SAMESITE: 'strict',
  LOG_LEVEL: 'info',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'swat-photos',
  S3_REPORTS_BUCKET: 'swat-reports',
  S3_ACCESS_KEY: 'swat',
  S3_SECRET_KEY: 'swat-secret',
  S3_FORCE_PATH_STYLE: true,
  S3_USE_INSTANCE_ROLE: false,
  WEIGHBRIDGE_RATE_LIMIT_PER_MIN: 500,
  GPS_WEBHOOK_TOKEN: 'a-long-enough-gps-webhook-token',
  GPS_WEBHOOK_ALLOWED_IPS: ' 203.0.113.10, 203.0.113.11 ,',
  GPS_INGEST_RATE_LIMIT_PER_MIN: 600,
  GPS_DEVICE_OFFLINE_MINUTES: 10,
  GPSID_BASE_URL: 'https://gps.id/api',
  GPSID_USERNAME: 'swat',
  GPSID_PASSWORD: 'gpsid-secret',
};

describe('AppConfigService', () => {
  const fakeConfig = {
    get: <K extends keyof Env>(key: K): Env[K] => ENV[key],
  } as unknown as ConfigService<Env, true>;
  const service = new AppConfigService(fakeConfig);

  it('exposes typed getters', () => {
    expect(service.port).toBe(4000);
    expect(service.databaseUrl).toContain('postgresql://');
    expect(service.sessionSecret).toBe(ENV.SESSION_SECRET);
    expect(service.jwtSecret).toBe(ENV.JWT_SECRET);
    expect(service.redisUrl).toBe(ENV.REDIS_URL);
    expect(service.logLevel).toBe('info');
    expect(service.nodeEnv).toBe('production');
  });

  it('derives isProduction', () => {
    expect(service.isProduction).toBe(true);
  });

  it('groups the storage config', () => {
    expect(service.storage).toEqual({
      endpoint: ENV.S3_ENDPOINT,
      region: ENV.S3_REGION,
      bucket: ENV.S3_BUCKET,
      reportsBucket: ENV.S3_REPORTS_BUCKET,
      accessKey: ENV.S3_ACCESS_KEY,
      secretKey: ENV.S3_SECRET_KEY,
      forcePathStyle: true,
      useInstanceRole: false,
    });
  });

  it('exposes session-cookie scoping (defaults: host-only, Strict)', () => {
    expect(service.sessionCookieDomain).toBeUndefined();
    expect(service.sessionCookieSameSite).toBe('strict');
  });

  it('surfaces a configured cross-subdomain cookie domain + SameSite', () => {
    const stagedEnv: Env = {
      ...ENV,
      SESSION_COOKIE_DOMAIN: '.swat.wahyutrip.com',
      SESSION_COOKIE_SAMESITE: 'lax',
    };
    const staged = new AppConfigService({
      get: <K extends keyof Env>(key: K): Env[K] => stagedEnv[key],
    } as unknown as ConfigService<Env, true>);
    expect(staged.sessionCookieDomain).toBe('.swat.wahyutrip.com');
    expect(staged.sessionCookieSameSite).toBe('lax');
  });

  it('groups GPS settings and parses the IP allowlist (trimmed, no blanks)', () => {
    expect(service.gps).toEqual({
      webhookToken: 'a-long-enough-gps-webhook-token',
      allowedIps: ['203.0.113.10', '203.0.113.11'],
      ingestRateLimitPerMin: 600,
      deviceOfflineMinutes: 10,
    });
  });

  it('returns GPS.id pull credentials when all are set', () => {
    expect(service.gpsidPullCredentials).toEqual({
      baseUrl: 'https://gps.id/api',
      username: 'swat',
      password: 'gpsid-secret',
    });
  });

  it('returns null GPS.id credentials when any is missing (fail loudly, never silent)', () => {
    const partialEnv: Env = { ...ENV, GPSID_PASSWORD: undefined };
    const partial = new AppConfigService({
      get: <K extends keyof Env>(key: K): Env[K] => partialEnv[key],
    } as unknown as ConfigService<Env, true>);
    expect(partial.gpsidPullCredentials).toBeNull();
  });
});
