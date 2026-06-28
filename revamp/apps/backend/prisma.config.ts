import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration. The connection URL moved out of `schema.prisma`; Migrate
 * reads it from here, and the runtime client uses the `@prisma/adapter-pg` driver
 * adapter (see `PrismaService`). Prisma 7 no longer auto-loads `.env`, so we load
 * the same files the CLI used before (prisma/.env for DB + legacy creds, then the
 * app/root env for overrides).
 */
loadEnv({ path: 'prisma/.env' });
loadEnv({ path: '.env.local' });
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
