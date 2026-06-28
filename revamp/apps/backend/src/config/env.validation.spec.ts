import { validateEnv } from './env.validation';

const VALID = {
  DATABASE_URL: 'postgresql://swat:pw@localhost:5432/swat?schema=public',
  SESSION_SECRET: 'a-long-enough-session-secret',
  JWT_SECRET: 'a-long-enough-jwt-secret-value',
};

describe('validateEnv', () => {
  it('parses a valid config and applies defaults', () => {
    const env = validateEnv(VALID);
    expect(env.NODE_ENV).toBe('development');
    expect(env.BE_PORT).toBe(3000);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.S3_USE_INSTANCE_ROLE).toBe(false);
    expect(env.REDIS_URL).toContain('redis://');
    expect(env.SESSION_COOKIE_DOMAIN).toBeUndefined();
    expect(env.SESSION_COOKIE_SAMESITE).toBe('strict');
  });

  it('coerces S3_FORCE_PATH_STYLE "false" to a boolean', () => {
    expect(validateEnv({ ...VALID, S3_FORCE_PATH_STYLE: 'false' }).S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('coerces S3_USE_INSTANCE_ROLE "true" to a boolean (AWS staging)', () => {
    expect(validateEnv({ ...VALID, S3_USE_INSTANCE_ROLE: 'true' }).S3_USE_INSTANCE_ROLE).toBe(true);
  });

  it('accepts a cross-subdomain cookie domain + SameSite=lax', () => {
    const env = validateEnv({
      ...VALID,
      SESSION_COOKIE_DOMAIN: '.swat.wahyutrip.com',
      SESSION_COOKIE_SAMESITE: 'lax',
    });
    expect(env.SESSION_COOKIE_DOMAIN).toBe('.swat.wahyutrip.com');
    expect(env.SESSION_COOKIE_SAMESITE).toBe('lax');
  });

  it('rejects an invalid SameSite value', () => {
    expect(() => validateEnv({ ...VALID, SESSION_COOKIE_SAMESITE: 'sloppy' })).toThrow(
      /SESSION_COOKIE_SAMESITE/,
    );
  });

  it('throws an aggregated error when required vars are missing', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment configuration/);
  });

  it('rejects a too-short session secret', () => {
    expect(() => validateEnv({ ...VALID, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('applies GPS ingestion defaults (token optional in dev)', () => {
    const env = validateEnv(VALID);
    expect(env.GPS_WEBHOOK_TOKEN).toBeUndefined();
    expect(env.GPS_WEBHOOK_ALLOWED_IPS).toBe('');
    expect(env.GPS_INGEST_RATE_LIMIT_PER_MIN).toBe(600);
    expect(env.GPS_DEVICE_OFFLINE_MINUTES).toBe(10);
  });

  it('rejects a too-short GPS webhook token', () => {
    expect(() => validateEnv({ ...VALID, GPS_WEBHOOK_TOKEN: 'short' })).toThrow(
      /GPS_WEBHOOK_TOKEN/,
    );
  });

  it('requires GPS_WEBHOOK_TOKEN in production', () => {
    expect(() => validateEnv({ ...VALID, NODE_ENV: 'production' })).toThrow(/GPS_WEBHOOK_TOKEN/);
    // …and accepts production once a valid token is supplied.
    expect(
      validateEnv({
        ...VALID,
        NODE_ENV: 'production',
        GPS_WEBHOOK_TOKEN: 'a-long-enough-gps-webhook-token',
      }).GPS_WEBHOOK_TOKEN,
    ).toBe('a-long-enough-gps-webhook-token');
  });

  it('rejects a malformed GPS.id base URL', () => {
    expect(() => validateEnv({ ...VALID, GPSID_BASE_URL: 'not-a-url' })).toThrow(/GPSID_BASE_URL/);
  });
});
