import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { type PartitionRef } from './archiving.types';

const exec = promisify(execFile);

/** Parent partitioned tables whose monthly children are archivable. */
const PARENT_TABLES = ['Trip', 'Haul', 'HaulAssignment', 'TpaInboundLog'] as const;

/** Resolve a child partition's parent table from its `<lowerparent>_yYYYYmMM` name. */
function parentOf(childTable: string): string | undefined {
  const prefix = childTable.replace(/_y\d{4}m\d{2}$/, '');
  return PARENT_TABLES.find((parent) => parent.toLowerCase() === prefix);
}

/** Parse the `YYYY-MM` period embedded in a partition name. */
function periodOf(childTable: string): string | null {
  const match = /_y(\d{4})m(\d{2})$/.exec(childTable);
  return match ? `${match[1]}-${match[2]}` : null;
}

/**
 * Infra seam for partition archiving (Phase 2, Epic 2.5). Catalog reads/writes go
 * through Prisma; the detach / `pg_dump` / re-attach operations shell out to
 * Postgres and the filesystem and are the operator's on-prem step (Docker is not
 * available in dev). Excluded from unit coverage — exercised by the integration
 * run on live infra (T-215). The orchestration + safety logic lives in the
 * service, which is fully unit-tested against this seam.
 */
@Injectable()
export class ArchivingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get archiveDir(): string {
    return process.env.ARCHIVE_DIR ?? '/var/lib/swat/archive';
  }

  /** All monthly child partitions across the partitioned parents, with their period. */
  async listMonthlyPartitions(): Promise<PartitionRef[]> {
    const rows = await this.prisma.$queryRaw<Array<{ tableName: string }>>`
      SELECT child.relname AS "tableName"
      FROM pg_inherits
      JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
      JOIN pg_class child  ON child.oid  = pg_inherits.inhrelid
      WHERE parent.relname IN ('Trip', 'Haul', 'HaulAssignment', 'TpaInboundLog')
        AND child.relname ~ '_y[0-9]{4}m[0-9]{2}$'
    `;
    return rows
      .map((row) => ({ tableName: row.tableName, period: periodOf(row.tableName) }))
      .filter((ref): ref is PartitionRef => ref.period !== null);
  }

  /**
   * A period's rollups are "complete" when either monthly rollups exist for it or
   * the partition holds no source trips (nothing to roll up). Guards archiving so
   * dashboards never lose data that was never aggregated.
   */
  async rollupsCompleteForMonth(period: string): Promise<boolean> {
    const monthStart = new Date(`${period}-01T00:00:00.000Z`);
    const rows = await this.prisma.$queryRaw<Array<{ rollups: bigint; trips: bigint }>>`
      SELECT
        (SELECT COUNT(*) FROM "MonthlyTonnageBySource" WHERE "month" = ${monthStart}::date)::bigint
          + (SELECT COUNT(*) FROM "MonthlyRouteActivity" WHERE "month" = ${monthStart}::date)::bigint AS "rollups",
        (SELECT COUNT(*) FROM "Trip"
           WHERE "operationDate" >= ${monthStart}::date
             AND "operationDate" < (${monthStart}::date + INTERVAL '1 month'))::bigint AS "trips"
    `;
    const result = rows[0];
    return (result?.rollups ?? 0n) > 0n || (result?.trips ?? 0n) === 0n;
  }

  findCatalog(tableName: string, period: string): Promise<{ id: string } | null> {
    return this.prisma.archiveCatalog.findFirst({
      where: { tableName, period },
      select: { id: true },
    });
  }

  listCatalog(): Promise<
    Array<{
      id: string;
      tableName: string;
      period: string;
      archiveType: string;
      rowCount: bigint;
      sizeBytes: bigint | null;
      detachedAt: Date;
      reattachedAt: Date | null;
    }>
  > {
    return this.prisma.archiveCatalog.findMany({
      orderBy: [{ period: 'desc' }, { tableName: 'asc' }],
      select: {
        id: true,
        tableName: true,
        period: true,
        archiveType: true,
        rowCount: true,
        sizeBytes: true,
        detachedAt: true,
        reattachedAt: true,
      },
    });
  }

  getCatalog(
    tableName: string,
    period: string,
  ): Promise<{ id: string; checksum: string | null; reattachedAt: Date | null } | null> {
    return this.prisma.archiveCatalog.findFirst({
      where: { tableName, period },
      select: { id: true, checksum: true, reattachedAt: true },
    });
  }

  /**
   * Detach the partition, dump+gzip it to the archive dir, checksum the file and
   * record its size + row count. Operator-run (needs `pg_dump` + live DB).
   */
  async detachAndArchive(
    tableName: string,
  ): Promise<{ location: string; rowCount: number; sizeBytes: number; checksum: string }> {
    const parent = parentOf(tableName);
    if (!parent) {
      throw new Error(`Tabel induk tidak dikenal untuk partisi ${tableName}.`);
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL tidak diset.');
    }

    const countRows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`,
    );
    const rowCount = Number(countRows[0]?.count ?? 0n);
    await this.prisma.$executeRawUnsafe(`ALTER TABLE "${parent}" DETACH PARTITION "${tableName}"`);

    await mkdir(this.archiveDir, { recursive: true });
    const location = join(this.archiveDir, `${tableName}.sql.gz`);
    await exec('bash', [
      '-c',
      `pg_dump "${databaseUrl}" --table='"${tableName}"' --no-owner | gzip > "${location}"`,
    ]);

    const checksum = await this.sha256(location);
    const { size } = await stat(location);
    return { location, rowCount, sizeBytes: size, checksum };
  }

  async insertCatalog(entry: {
    tableName: string;
    period: string;
    location: string;
    rowCount: number;
    sizeBytes: number;
    checksum: string;
    createdById: string | null;
  }): Promise<void> {
    await this.prisma.archiveCatalog.create({
      data: {
        tableName: entry.tableName,
        period: entry.period,
        archiveType: 'detached-partition',
        location: entry.location,
        rowCount: BigInt(entry.rowCount),
        sizeBytes: BigInt(entry.sizeBytes),
        checksum: entry.checksum,
        detachedAt: new Date(),
        createdById: entry.createdById,
      },
    });
  }

  /**
   * Re-attach an archived partition: verify the on-disk checksum against the
   * catalog, restore the dump, and ATTACH it back to its parent. Operator-run.
   */
  async reattach(
    tableName: string,
    period: string,
    expectedChecksum: string | null,
  ): Promise<{ rowCount: number; checksumVerified: boolean }> {
    const parent = parentOf(tableName);
    if (!parent) {
      throw new Error(`Tabel induk tidak dikenal untuk partisi ${tableName}.`);
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL tidak diset.');
    }
    const location = join(this.archiveDir, `${tableName}.sql.gz`);
    const checksumVerified =
      expectedChecksum !== null && (await this.sha256(location)) === expectedChecksum;
    if (!checksumVerified) {
      throw new Error(`Checksum arsip ${tableName} tidak cocok — pemulihan dibatalkan.`);
    }

    await exec('bash', ['-c', `gunzip -c "${location}" | psql "${databaseUrl}"`]);
    const monthStart = `${period}-01`;
    const monthEnd = new Date(`${monthStart}T00:00:00.000Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    await this.prisma.$executeRawUnsafe(
      `ALTER TABLE "${parent}" ATTACH PARTITION "${tableName}" ` +
        `FOR VALUES FROM ('${monthStart}') TO ('${monthEnd.toISOString().slice(0, 10)}')`,
    );

    const countRows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`,
    );
    return { rowCount: Number(countRows[0]?.count ?? 0n), checksumVerified };
  }

  async markReattached(id: string): Promise<void> {
    await this.prisma.archiveCatalog.update({
      where: { id },
      data: { reattachedAt: new Date() },
    });
  }

  private sha256(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(path);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }
}
