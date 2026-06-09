/**
 * Rollup backfill (ops). Recomputes every daily + monthly monitoring rollup
 * across a date range using the production {@link RollupService} — idempotent, so
 * it is the canonical way to refresh the aggregates after a historical bulk
 * import. (The nightly cron only heals the trailing week; the per-trip hook only
 * touches the mutated day — neither covers a back-dated bulk load.)
 *
 * With no arguments it backfills the full trip history (min..max operationDate).
 *
 * Run (env must provide DATABASE_URL, e.g. `set -a && . ./.env.local && set +a`):
 *   pnpm --filter @swat/backend run rollup:backfill                  # full history
 *   pnpm --filter @swat/backend run rollup:backfill -- 2025-06-01 2025-12-31
 */
import { Logger } from '@nestjs/common';

import { formatDateOnly, parseDateOnly } from '../src/common/dates';
import { RollupRepository } from '../src/modules/analytics/rollup.repository';
import { RollupService } from '../src/modules/analytics/rollup.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const logger = new Logger('rollup-backfill');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolve the day range from args, falling back to the trip table's bounds. */
async function resolveRange(
  prisma: PrismaService,
  fromArg: string | undefined,
  toArg: string | undefined,
): Promise<{ from: Date; to: Date } | null> {
  const [bounds] = await prisma.$queryRaw<Array<{ min: Date | null; max: Date | null }>>`
    SELECT MIN("operationDate") AS min, MAX("operationDate") AS max FROM "Trip"
  `;
  const from = fromArg ? parseDateOnly(fromArg) : (bounds?.min ?? null);
  const to = toArg ? parseDateOnly(toArg) : (bounds?.max ?? null);
  if (from === null || to === null) {
    return null;
  }
  if (from.getTime() > to.getTime()) {
    throw new Error(`Rentang tidak valid: ${formatDateOnly(from)} > ${formatDateOnly(to)}.`);
  }
  return { from, to };
}

async function main(): Promise<void> {
  // Drop a leading `--` that `pnpm run <script> -- <args>` forwards into argv.
  const [fromArg, toArg] = process.argv.slice(2).filter((arg) => arg !== '--');
  for (const arg of [fromArg, toArg]) {
    if (arg !== undefined && !ISO_DATE.test(arg)) {
      throw new Error(`Argumen tanggal harus berformat YYYY-MM-DD, diterima: "${arg}".`);
    }
  }

  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const range = await resolveRange(prisma, fromArg, toArg);
    if (range === null) {
      logger.warn('Tidak ada data trip untuk diagregasi — backfill dilewati.');
      return;
    }
    const service = new RollupService(new RollupRepository(prisma));
    logger.log(`Backfill rollup ${formatDateOnly(range.from)} … ${formatDateOnly(range.to)} …`);
    const { days, months } = await service.backfill(range.from, range.to);
    logger.log(`Selesai: ${days} hari + ${months} bulan rollup diperbarui.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
