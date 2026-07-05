/**
 * One-off: normalize every existing user's password on an ALREADY-SEEDED
 * database (e.g. the live staging DB) to the new shared default, without
 * touching any other data (no truncate, no reseed of master/transactional
 * data). Idempotent — safe to re-run.
 *
 * - Every `User` row gets `passwordHash = hash('12345678')` and
 *   `mustChangePassword = true`, EXCEPT `superadmin`, which is upserted (role
 *   Super Administrator) with a hash of `SUPERADMIN_PASSWORD` and
 *   `mustChangePassword = false`.
 * - `--dry-run` prints the counts it WOULD change and exits without writing.
 *
 * Run against staging (DATABASE_URL must point at the target DB — decrypt
 * infra/env/backend/.env.staging first):
 *   pnpm --filter @swat/backend exec ts-node scripts/reset-staging-passwords.ts --dry-run
 *   pnpm --filter @swat/backend exec ts-node scripts/reset-staging-passwords.ts
 */
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { getSuperadminPassword, hashPassword } from '../src/common/auth/password';
import { loadScriptEnv } from '../src/common/prisma/load-script-env';
import { pgAdapter } from '../src/common/prisma/pg-adapter';

loadScriptEnv();

const logger = new Logger('reset-staging-passwords');
const DEFAULT_PASSWORD = '12345678';
const SUPERADMIN_USERNAME = 'superadmin';
const SUPERADMIN_ROLE_NAME = 'Super Administrator';

async function main(): Promise<void> {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const prisma = new PrismaClient({ adapter: pgAdapter() });
  await prisma.$connect();
  try {
    const superAdminRole = await prisma.role.findUnique({ where: { name: SUPERADMIN_ROLE_NAME } });
    if (!superAdminRole) {
      throw new Error(
        `Role "${SUPERADMIN_ROLE_NAME}" not found — run the seed/migration once to create it first.`,
      );
    }

    const [others, existingSuperadmin] = await Promise.all([
      prisma.user.count({ where: { username: { not: SUPERADMIN_USERNAME } } }),
      prisma.user.findUnique({ where: { username: SUPERADMIN_USERNAME } }),
    ]);

    logger.log(
      `${dryRun ? '[dry-run] ' : ''}Would reset ${others} user(s) to the shared default password ` +
        `(forced reset), and ${existingSuperadmin ? 'update' : 'create'} "${SUPERADMIN_USERNAME}" ` +
        `with the env password (no forced reset).`,
    );
    if (dryRun) {
      return;
    }

    const sharedHash = await hashPassword(DEFAULT_PASSWORD);
    const { count } = await prisma.user.updateMany({
      where: { username: { not: SUPERADMIN_USERNAME } },
      data: { passwordHash: sharedHash, mustChangePassword: true },
    });

    const superAdminHash = await hashPassword(getSuperadminPassword());
    await prisma.user.upsert({
      where: { username: SUPERADMIN_USERNAME },
      update: {
        passwordHash: superAdminHash,
        mustChangePassword: false,
        roleId: superAdminRole.id,
      },
      create: {
        username: SUPERADMIN_USERNAME,
        name: 'Super Administrator',
        passwordHash: superAdminHash,
        roleId: superAdminRole.id,
        mustChangePassword: false,
      },
    });

    logger.log(`Done: ${count} user(s) reset, "${SUPERADMIN_USERNAME}" ready.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
