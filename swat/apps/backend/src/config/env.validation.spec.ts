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
    expect(env.PORT).toBe(3000);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.REDIS_URL).toContain('redis://');
  });

  it('coerces S3_FORCE_PATH_STYLE "false" to a boolean', () => {
    expect(validateEnv({ ...VALID, S3_FORCE_PATH_STYLE: 'false' }).S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('throws an aggregated error when required vars are missing', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment configuration/);
  });

  it('rejects a too-short session secret', () => {
    expect(() => validateEnv({ ...VALID, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });
});
