/**
 * Standalone default-corridor backfill — ensure every route has a road-snapped
 * default corridor. Idempotent; safe to re-run. Snapping needs GOOGLE_MAPS_SERVER_KEY
 * (else straight-line). The demo seed + legacy migration call this automatically;
 * this runner is for ad-hoc backfills against an existing DB.
 *
 *   GOOGLE_MAPS_SERVER_KEY=… DATABASE_URL=… pnpm --filter @swat/backend run corridors:backfill
 */
import { PrismaClient } from '@prisma/client';

import { loadScriptEnv } from '../../src/common/prisma/load-script-env';
import { pgAdapter } from '../../src/common/prisma/pg-adapter';
import { log } from '../migration/lib/runtime';

import { backfillRouteCorridors } from './backfill-route-corridors';

if (!process.env.SEED_ENV) {
  loadScriptEnv();
}
const prisma = new PrismaClient({ adapter: pgAdapter() });

async function main(): Promise<void> {
  await backfillRouteCorridors(prisma, { log });
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
