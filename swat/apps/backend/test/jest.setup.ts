/* Dummy environment for unit tests so any module that loads the config layer
 * (which validates env eagerly) does not throw. Real values come from the
 * environment in dev/CI. */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://swat:swat@localhost:5432/swat?schema=public';
process.env.SESSION_SECRET ??= 'test-session-secret-placeholder';
process.env.JWT_SECRET ??= 'test-jwt-secret-placeholder';
process.env.REDIS_URL ??= 'redis://localhost:6379';
