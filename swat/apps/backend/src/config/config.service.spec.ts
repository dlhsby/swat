import { type ConfigService } from '@nestjs/config';

import { AppConfigService } from './config.service';
import { type Env } from './env.validation';

const ENV: Env = {
  NODE_ENV: 'production',
  BE_PORT: 4000,
  DATABASE_URL: 'postgresql://swat:pw@localhost:5432/swat',
  SESSION_SECRET: 'a-long-enough-session-secret',
  JWT_SECRET: 'a-long-enough-jwt-secret-value',
  LOG_LEVEL: 'info',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'swat-photos',
  S3_REPORTS_BUCKET: 'swat-reports',
  S3_ACCESS_KEY: 'swat',
  S3_SECRET_KEY: 'swat-secret',
  S3_FORCE_PATH_STYLE: true,
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
    });
  });
});
