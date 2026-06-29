/**
 * Generate every valid (origin, destination, category) route that doesn't yet
 * exist, per the operator rules (see lib/route-completion.ts). Idempotent — safe
 * to re-run; inserts only what's missing. Standalone runner for an existing DB
 * (the demo seed and the legacy migration call `completeRoutes` inline too).
 *
 *   DATABASE_URL=… pnpm --filter @swat/backend run migrate:routes
 */
import { PrismaClient } from '@prisma/client';

import { loadScriptEnv } from '../../src/common/prisma/load-script-env';
import { pgAdapter } from '../../src/common/prisma/pg-adapter';

import { completeRoutes } from './lib/route-completion';
import { log } from './lib/runtime';

if (!process.env.SEED_ENV) {
  loadScriptEnv();
}
const prisma = new PrismaClient({ adapter: pgAdapter() });

async function main(): Promise<void> {
  const stats = await completeRoutes(prisma);
  log(
    `Route completion: +${stats.generated} new routes ` +
      `(${
        Object.entries(stats.byCategory)
          .map(([c, n]) => `${c}=${n}`)
          .join(', ') || 'none'
      }); ` +
      `${stats.existing} already existed → ${stats.totalAfter} total.`,
  );
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
