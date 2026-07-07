import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration. The connection URL moved out of `schema.prisma`; Migrate
 * reads it from here, and the runtime client uses the `@prisma/adapter-pg` driver
 * adapter (see `PrismaService`). Prisma 7 no longer auto-loads `.env`, so we load
 * the same files the CLI used before: prisma/.env (DB + legacy creds) first, then the
 * app env, then the repo-root env — mirroring the runtime AppConfigModule's
 * `envFilePath` order. `dotenv` is first-wins (it never overrides an already-set var),
 * so prisma/.env keeps precedence while shared keys like SUPERADMIN_PASSWORD /
 * DATABASE_URL fall back to the root `.env.local` (the documented single source).
 */
loadEnv({ path: 'prisma/.env' });
loadEnv({ path: '.env.local' });
loadEnv({ path: '../../.env.local' });
loadEnv({ path: '../../.env' });
loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
