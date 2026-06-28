/**
 * Backfill `TpaInboundLog.tripId` for migrated weighbridge rows (Phase 5, T-504).
 *
 * The legacy load (`migrate-legacy --include-transactions`) imports
 * `sampahmasuktpa` into TpaInboundLog with `tripId = NULL` (the legacy table has
 * no FK to a trip). This one-shot pass links each unlinked log to its DISPOSAL
 * Trip by matching (operationDate + vehicle plate + gross/tare weight), so the
 * historical TPA tonnage joins to trips — the same link the live weighbridge sets.
 *
 * Idempotent: only rows with `tripId IS NULL` are considered, and each candidate
 * trip is used at most once per run. Keyset-batched by id (a row that finds no
 * match keeps `tripId NULL`, so the cursor — not the filter — drives progress).
 *
 * Caveat: a vehicle whose plate was disambiguated on import (e.g. `B9552EQ#43`,
 * see migrate-legacy plate handling) won't match — the log carries the raw legacy
 * `nopol` while the Trip's vehicle plate is suffixed. Those land in `unmatched`;
 * reconcile the plate in-app first, then re-run.
 *
 * Run (env must provide DATABASE_URL, e.g. `set -a && . ./.env.local && set +a`):
 *   pnpm --filter @swat/backend run migrate:backfill-tpa
 */
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { loadScriptEnv } from '../../src/common/prisma/load-script-env';
import { pgAdapter } from '../../src/common/prisma/pg-adapter';

loadScriptEnv();

const logger = new Logger('backfill-tpa');
const BATCH_SIZE = 1000;

interface PendingLog {
  id: string;
  date: Date | null;
  plateNumber: string | null;
  grossWeight: number | null;
  tareWeight: number | null;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: pgAdapter() });
  const usedTripIds = new Set<string>();
  let cursor: string | null = null;
  let scanned = 0;
  let linked = 0;
  let unmatched = 0;
  let ambiguous = 0;
  const unmatchedSamples: string[] = [];

  try {
    for (;;) {
      const batch: PendingLog[] = await prisma.tpaInboundLog.findMany({
        where: { tripId: null, ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true, date: true, plateNumber: true, grossWeight: true, tareWeight: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) {
        break;
      }
      cursor = batch[batch.length - 1]?.id ?? cursor;
      scanned += batch.length;

      for (const log of batch) {
        const match = await findMatch(prisma, log, usedTripIds);
        if (match === 'ambiguous') {
          ambiguous += 1;
          continue;
        }
        if (match === null) {
          unmatched += 1;
          if (unmatchedSamples.length < 10) {
            unmatchedSamples.push(
              `${log.plateNumber ?? '?'} @ ${log.date?.toISOString().slice(0, 10) ?? '?'}`,
            );
          }
          continue;
        }
        await prisma.tpaInboundLog.update({ where: { id: log.id }, data: { tripId: match } });
        usedTripIds.add(match);
        linked += 1;
      }
      logger.log(
        `Scanned ${scanned} · linked ${linked} · unmatched ${unmatched} · ambiguous ${ambiguous}`,
      );
    }

    logger.log(
      `Selesai: ${linked} tertaut, ${unmatched} tanpa pasangan, ${ambiguous} ambigu (dari ${scanned} log).`,
    );
    if (unmatchedSamples.length > 0) {
      logger.warn(`Contoh tanpa pasangan: ${unmatchedSamples.join('; ')}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Resolve the DISPOSAL trip a log should link to. Returns the trip id, `null`
 * (no candidate), or `'ambiguous'` (the only candidate is already taken this run,
 * or weights are missing so a confident match isn't possible).
 */
async function findMatch(
  prisma: PrismaClient,
  log: PendingLog,
  usedTripIds: Set<string>,
): Promise<string | null | 'ambiguous'> {
  if (log.date === null || log.plateNumber === null) {
    return null;
  }
  if (log.grossWeight === null || log.tareWeight === null) {
    return 'ambiguous';
  }
  const candidates = await prisma.trip.findMany({
    where: {
      operationDate: log.date,
      grossWeight: log.grossWeight,
      tareWeight: log.tareWeight,
      route: { category: 'DISPOSAL' },
      haulAssignment: { haul: { vehicle: { plateNumber: log.plateNumber } } },
    },
    select: { id: true },
    take: 5,
  });
  const free = candidates.find((trip) => !usedTripIds.has(trip.id));
  if (!free) {
    return candidates.length > 0 ? 'ambiguous' : null;
  }
  return free.id;
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
