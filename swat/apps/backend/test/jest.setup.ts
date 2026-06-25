/* Load reflect-metadata once for the whole unit suite — mirrors the app bootstrap
 * (main.ts). Needed by any test that loads a class-validator/class-transformer
 * DTO at runtime (e.g. the GPS.id webhook normalizer); most specs use type-only
 * DTO imports and never trip this, but it must be present when they don't. */
import 'reflect-metadata';

/* Dummy environment for unit tests so any module that loads the config layer
 * (which validates env eagerly) does not throw. Real values come from the
 * environment in dev/CI. */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://swat:swat@localhost:5432/swat?schema=public';
process.env.SESSION_SECRET ??= 'test-session-secret-placeholder';
process.env.JWT_SECRET ??= 'test-jwt-secret-placeholder';
process.env.REDIS_URL ??= 'redis://localhost:6379';
