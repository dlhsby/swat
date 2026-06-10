import { z } from 'zod';

/**
 * Environment schema. Validated once at boot via `ConfigModule.forRoot`'s
 * `validate` hook so the process fails fast with a clear message when a
 * required variable is missing or malformed — never at first use deep in a
 * request handler.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BE_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (postgresql://...)'),

  // Auth / sessions
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Cache
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Object storage (S3 / MinIO)
  S3_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('swat-photos'),
  S3_ACCESS_KEY: z.string().min(1).default('swat'),
  S3_SECRET_KEY: z.string().min(1).default('swat-secret'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validation hook for `@nestjs/config`. Throws an aggregated, readable error
 * listing every invalid/missing variable.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
