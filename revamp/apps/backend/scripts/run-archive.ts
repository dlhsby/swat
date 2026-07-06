/**
 * Partition archiving (ops). Runs the same monthly archive the {@link ArchivingService}
 * cron runs — detach + `pg_dump` + catalog of every monthly partition older than the
 * 13-month retention cutoff — but on demand, so it can be chained after a dump reseed
 * (`infra/seed-legacy-from-dump.sh`) once the rollups are backfilled.
 *
 * SAFETY: `detachAndArchive` DETACHES the partition BEFORE it `pg_dump`s it, so a missing
 * `pg_dump` (or an unwritable ARCHIVE_DIR) would leave a partition detached-but-not-archived
 * (orphaned). This runner therefore PRE-FLIGHTS both and refuses to archive anything unless
 * they're usable — turning "would orphan" into a clean skip. That makes it safe to invoke
 * unconditionally from the seed: on a box without pg_dump (e.g. an over-tunnel staging load)
 * it no-ops; on the on-prem prod box it archives for real.
 *
 * Run (env must provide DATABASE_URL; optional ARCHIVE_DIR, default /var/lib/swat/archive):
 *   pnpm --filter @swat/backend run archive:run
 */
import { execFileSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';

import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { todayDateOnly } from '../src/common/dates';
import { loadScriptEnv } from '../src/common/prisma/load-script-env';
import { pgAdapter } from '../src/common/prisma/pg-adapter';
import { ArchivingRepository } from '../src/modules/archiving/archiving.repository';
import { ArchivingService } from '../src/modules/archiving/archiving.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { type PrismaService } from '../src/modules/prisma/prisma.service';

loadScriptEnv();

const logger = new Logger('archive-run');

/** True only if `pg_dump` is on PATH and ARCHIVE_DIR is writable — the two things
 * `detachAndArchive` needs AFTER it has already detached a partition. */
async function archivePrerequisitesOk(): Promise<boolean> {
  try {
    execFileSync('pg_dump', ['--version'], { stdio: 'ignore' });
  } catch {
    logger.warn('pg_dump not found on PATH — skipping archiving (nothing detached).');
    return false;
  }
  const dir = process.env.ARCHIVE_DIR ?? '/var/lib/swat/archive';
  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
  } catch {
    logger.warn(`ARCHIVE_DIR "${dir}" is not writable — skipping archiving (nothing detached).`);
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  if (!(await archivePrerequisitesOk())) {
    return;
  }

  const prisma = new PrismaClient({ adapter: pgAdapter() }) as unknown as PrismaService;
  await prisma.$connect();
  try {
    const service = new ArchivingService(new ArchivingRepository(prisma), new AuditService(prisma));
    const summary = await service.runMonthlyArchive(todayDateOnly());
    const by = (status: string): number =>
      summary.outcomes.filter((o) => o.status === status).length;
    const failed = by('failed');
    logger.log(
      `Archive ≤ ${summary.cutoffPeriod}: ${by('archived')} archived, ` +
        `${by('skipped-cataloged')} already-cataloged, ` +
        `${by('skipped-rollups-incomplete')} skipped (rollups incomplete), ${failed} failed.`,
    );
    if (failed > 0) {
      // A failure can mean a partition was detached but not dumped — surface loudly and
      // exit non-zero so the caller/operator investigates (potential orphaned partition).
      for (const o of summary.outcomes.filter((x) => x.status === 'failed')) {
        logger.error(`  FAILED ${o.tableName} (${o.period}): ${o.detail ?? 'unknown'}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
