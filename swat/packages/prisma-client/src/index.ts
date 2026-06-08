import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaClient singleton. Re-using one instance avoids exhausting the
 * connection pool during dev hot-reloads. The generated client comes from
 * apps/backend/prisma/schema.prisma (run `prisma generate` after install).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export everything from the generated client (includes PrismaClient,
// model types, and enums) so consumers import them from a single place.
export * from '@prisma/client';
