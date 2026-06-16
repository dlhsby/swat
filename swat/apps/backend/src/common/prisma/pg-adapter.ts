import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Builds the Prisma 7 PostgreSQL driver adapter. Prisma 7 removed the implicit
 * `datasource.url` connection; every PrismaClient is constructed with an adapter.
 * Shared by {@link PrismaService}, the seed, and the migration scripts.
 */
export function pgAdapter(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaPg {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to build the Prisma pg adapter');
  }
  return new PrismaPg({ connectionString });
}
