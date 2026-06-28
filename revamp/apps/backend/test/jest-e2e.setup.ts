/* E2E setup. Unlike the unit setup, this does NOT inject placeholder secrets —
 * the real DATABASE_URL / SESSION_SECRET / REDIS_URL are loaded by the app's
 * ConfigModule from the repo-root `.env.local`, so e2e runs against the live
 * docker-compose stack. Only NODE_ENV is forced. */
process.env.NODE_ENV ??= 'test';
