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
});
