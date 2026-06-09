import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { type SessionUser } from '../../common/auth/session.types';
import { todayDateOnly } from '../../common/dates';
import { AuditService } from '../audit/audit.service';

import { ArchivingRepository } from './archiving.repository';
import { type ArchiveOutcome, type ArchiveSummary, type ReattachOutcome } from './archiving.types';

/** Raw rows older than this many months are archived (specs/12 §3 retention). */
const ARCHIVE_AGE_MONTHS = 13;

/** `YYYY-MM` of the month `n` months before `date` (UTC). */
function monthsBefore(date: Date, n: number): string {
  const anchor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - n, 1));
  const month = `${anchor.getUTCMonth() + 1}`.padStart(2, '0');
  return `${anchor.getUTCFullYear()}-${month}`;
}

/**
 * Partition archiving lifecycle (Phase 2, Epic 2.5). Orchestrates the monthly
 * detach/compress/catalog of partitions older than 13 months and the audited
 * re-attach. Idempotent (already-cataloged partitions are skipped) and defensive
 * (a partition whose rollups are incomplete is left attached). The actual
 * Postgres/filesystem operations live behind {@link ArchivingRepository} and are
 * the operator's on-prem step; this orchestration is unit-tested against that seam.
 */
@Injectable()
export class ArchivingService {
  private readonly logger = new Logger(ArchivingService.name);

  constructor(
    private readonly repo: ArchivingRepository,
    private readonly audit: AuditService,
  ) {}

  @Cron('0 1 1 * *', { timeZone: 'Asia/Jakarta' })
  async handleMonthly(): Promise<void> {
    await this.runMonthlyArchive(todayDateOnly());
  }

  /** Archive every monthly partition at or before the 13-month cutoff. */
  async runMonthlyArchive(today: Date): Promise<ArchiveSummary> {
    const cutoffPeriod = monthsBefore(today, ARCHIVE_AGE_MONTHS);
    const partitions = await this.repo.listMonthlyPartitions();
    const candidates = partitions
      .filter((part) => part.period <= cutoffPeriod)
      .sort((a, b) => a.period.localeCompare(b.period));

    const outcomes: ArchiveOutcome[] = [];
    for (const part of candidates) {
      outcomes.push(await this.archiveOne(part.tableName, part.period));
    }

    const archived = outcomes.filter((o) => o.status === 'archived').length;
    this.logger.log(
      `Arsip partisi (≤ ${cutoffPeriod}): ${archived}/${candidates.length} diarsipkan.`,
    );
    return { cutoffPeriod, outcomes };
  }

  private async archiveOne(tableName: string, period: string): Promise<ArchiveOutcome> {
    try {
      if (await this.repo.findCatalog(tableName, period)) {
        return { tableName, period, status: 'skipped-cataloged' };
      }
      if (!(await this.repo.rollupsCompleteForMonth(period))) {
        this.logger.warn(`Arsip dilewati ${tableName}: rollup ${period} belum lengkap.`);
        return { tableName, period, status: 'skipped-rollups-incomplete' };
      }
      const result = await this.repo.detachAndArchive(tableName);
      await this.repo.insertCatalog({ tableName, period, ...result, createdById: null });
      return { tableName, period, status: 'archived', detail: `${result.rowCount} baris` };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gagal mengarsipkan ${tableName}: ${detail}`);
      return { tableName, period, status: 'failed', detail };
    }
  }

  /** Re-attach an archived partition (admin, audited). Checksum-verified in the repo. */
  async reattach(tableName: string, period: string, actor: SessionUser): Promise<ReattachOutcome> {
    const catalog = await this.repo.getCatalog(tableName, period);
    if (!catalog) {
      throw new NotFoundException(`Arsip ${tableName} (${period}) tidak ditemukan.`);
    }
    if (catalog.reattachedAt) {
      throw new ConflictException(`Arsip ${tableName} (${period}) sudah dipulihkan.`);
    }

    const result = await this.repo.reattach(tableName, period, catalog.checksum);
    await this.repo.markReattached(catalog.id);
    await this.audit.record({
      actor,
      action: 'archive.reattach',
      entityType: 'ArchiveCatalog',
      entityId: catalog.id,
      details: `${tableName} (${period}), ${result.rowCount} baris`,
    });
    return {
      tableName,
      period,
      rowCount: result.rowCount,
      checksumVerified: result.checksumVerified,
    };
  }

  /** Catalog listing for the admin view (BigInt counts coerced to numbers). */
  async listArchives(): Promise<
    Array<{
      id: number;
      tableName: string;
      period: string;
      archiveType: string;
      rowCount: number;
      sizeBytes: number | null;
      detachedAt: string;
      reattachedAt: string | null;
    }>
  > {
    const rows = await this.repo.listCatalog();
    return rows.map((row) => ({
      id: row.id,
      tableName: row.tableName,
      period: row.period,
      archiveType: row.archiveType,
      rowCount: Number(row.rowCount),
      sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
      detachedAt: row.detachedAt.toISOString(),
      reattachedAt: row.reattachedAt ? row.reattachedAt.toISOString() : null,
    }));
  }
}
