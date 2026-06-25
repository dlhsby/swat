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

  // Session cookie scoping. Defaults preserve the same-origin on-prem prod
  // behaviour (host-only cookie, SameSite=Strict). For the AWS staging split —
  // web on `swat.wahyutrip.com`, API on `api.swat.wahyutrip.com` — set
  // SESSION_COOKIE_DOMAIN=.swat.wahyutrip.com so the cookie is sent to both
  // subdomains, and SESSION_COOKIE_SAMESITE=lax so cross-subdomain navigation
  // and credentialed XHR carry it (Secure is still derived from NODE_ENV).
  SESSION_COOKIE_DOMAIN: z.string().min(1).optional(),
  SESSION_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Cache
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Object storage (S3 / MinIO)
  S3_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('swat-photos'),
  // Dedicated bucket for generated reports (ephemeral, 7-day TTL) — kept apart
  // from the permanent photo bucket so a MinIO lifecycle rule can back up cleanup.
  S3_REPORTS_BUCKET: z.string().min(1).default('swat-reports'),
  S3_ACCESS_KEY: z.string().min(1).default('swat'),
  S3_SECRET_KEY: z.string().min(1).default('swat-secret'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // When true, the S3 client drops the static endpoint + access/secret keys so
  // the AWS SDK resolves credentials from the ambient provider chain (the EC2
  // instance IAM role on AWS staging). Leave false for MinIO (dev / on-prem prod),
  // which needs the endpoint + keys above and S3_FORCE_PATH_STYLE=true.
  S3_USE_INSTANCE_ROLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Weighbridge integration (Phase 4). Per-minute rate limit applied to a USER
  // principal calling /weighbridge/* (service accounts use their own per-account
  // ServiceAccount.rateLimitPerMin). Default mirrors the spec's 500/min.
  WEIGHBRIDGE_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(500),
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
