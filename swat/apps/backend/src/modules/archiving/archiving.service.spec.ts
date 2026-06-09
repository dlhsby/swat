import { ConflictException, NotFoundException } from '@nestjs/common';

import { type SessionUser } from '../../common/auth/session.types';
import { parseDateOnly } from '../../common/dates';
import { type AuditService } from '../audit/audit.service';

import { type ArchivingRepository } from './archiving.repository';
import { ArchivingService } from './archiving.service';

const ACTOR: SessionUser = { id: 1, username: 'admin', roleId: 1, mustChangePassword: false };
const TODAY = parseDateOnly('2026-06-08'); // 13-month cutoff = 2025-05

function createRepo(): jest.Mocked<ArchivingRepository> {
  return {
    listMonthlyPartitions: jest.fn().mockResolvedValue([]),
    rollupsCompleteForMonth: jest.fn().mockResolvedValue(true),
    findCatalog: jest.fn().mockResolvedValue(null),
    listCatalog: jest.fn().mockResolvedValue([]),
    getCatalog: jest.fn().mockResolvedValue(null),
    detachAndArchive: jest
      .fn()
      .mockResolvedValue({ location: '/a.gz', rowCount: 100, sizeBytes: 2048, checksum: 'abc' }),
    insertCatalog: jest.fn().mockResolvedValue(undefined),
    reattach: jest.fn().mockResolvedValue({ rowCount: 100, checksumVerified: true }),
    markReattached: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ArchivingRepository>;
}

describe('ArchivingService', () => {
  let repo: jest.Mocked<ArchivingRepository>;
  let audit: { record: jest.Mock };
  let service: ArchivingService;

  beforeEach(() => {
    repo = createRepo();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ArchivingService(repo, audit as unknown as AuditService);
  });

  describe('runMonthlyArchive', () => {
    beforeEach(() => {
      repo.listMonthlyPartitions.mockResolvedValue([
        { tableName: 'trip_y2025m04', period: '2025-04' }, // < cutoff → archive
        { tableName: 'trip_y2025m05', period: '2025-05' }, // == cutoff → archive
        { tableName: 'trip_y2025m06', period: '2025-06' }, // > cutoff → keep
        { tableName: 'trip_y2026m06', period: '2026-06' }, // current → keep
      ]);
    });

    it('archives only partitions at or before the 13-month cutoff', async () => {
      const summary = await service.runMonthlyArchive(TODAY);

      expect(summary.cutoffPeriod).toBe('2025-05');
      expect(summary.outcomes.map((o) => o.period)).toEqual(['2025-04', '2025-05']);
      expect(summary.outcomes.every((o) => o.status === 'archived')).toBe(true);
      expect(repo.detachAndArchive).toHaveBeenCalledTimes(2);
      expect(repo.insertCatalog).toHaveBeenCalledTimes(2);
    });

    it('skips a partition already in the catalog (idempotent)', async () => {
      repo.findCatalog.mockImplementation((tableName) =>
        Promise.resolve(tableName === 'trip_y2025m04' ? { id: 7 } : null),
      );

      const summary = await service.runMonthlyArchive(TODAY);

      const m04 = summary.outcomes.find((o) => o.period === '2025-04');
      expect(m04?.status).toBe('skipped-cataloged');
      expect(repo.detachAndArchive).toHaveBeenCalledTimes(1); // only 2025-05
    });

    it('aborts a partition whose rollups are incomplete', async () => {
      repo.rollupsCompleteForMonth.mockImplementation((period) =>
        Promise.resolve(period !== '2025-04'),
      );

      const summary = await service.runMonthlyArchive(TODAY);

      expect(summary.outcomes.find((o) => o.period === '2025-04')?.status).toBe(
        'skipped-rollups-incomplete',
      );
      expect(repo.detachAndArchive).toHaveBeenCalledTimes(1);
    });

    it('records a failure without aborting the rest of the run', async () => {
      repo.detachAndArchive.mockImplementationOnce(() =>
        Promise.reject(new Error('pg_dump gagal')),
      );

      const summary = await service.runMonthlyArchive(TODAY);

      expect(summary.outcomes[0]).toMatchObject({ status: 'failed', detail: 'pg_dump gagal' });
      expect(summary.outcomes[1]?.status).toBe('archived');
    });

    it('stringifies a non-Error failure', async () => {
      repo.detachAndArchive.mockImplementationOnce(() => Promise.reject('disk full'));
      const summary = await service.runMonthlyArchive(TODAY);
      expect(summary.outcomes[0]).toMatchObject({ status: 'failed', detail: 'disk full' });
    });

    it('runs the monthly cron handler without throwing', async () => {
      repo.listMonthlyPartitions.mockResolvedValue([]);
      await expect(service.handleMonthly()).resolves.toBeUndefined();
    });
  });

  describe('reattach', () => {
    it('404s an unknown archive', async () => {
      repo.getCatalog.mockResolvedValue(null);
      await expect(service.reattach('trip_y2025m04', '2025-04', ACTOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409s an archive already re-attached', async () => {
      repo.getCatalog.mockResolvedValue({ id: 7, checksum: 'abc', reattachedAt: new Date() });
      await expect(service.reattach('trip_y2025m04', '2025-04', ACTOR)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('re-attaches, marks the catalog, and audits the action', async () => {
      repo.getCatalog.mockResolvedValue({ id: 7, checksum: 'abc', reattachedAt: null });

      const result = await service.reattach('trip_y2025m04', '2025-04', ACTOR);

      expect(repo.reattach).toHaveBeenCalledWith('trip_y2025m04', '2025-04', 'abc');
      expect(repo.markReattached).toHaveBeenCalledWith(7);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'archive.reattach', entityId: 7 }),
      );
      expect(result).toMatchObject({ rowCount: 100, checksumVerified: true });
    });
  });

  describe('listArchives', () => {
    it('coerces BigInt counts and ISO-formats the timestamps', async () => {
      repo.listCatalog.mockResolvedValue([
        {
          id: 1,
          tableName: 'trip_y2025m04',
          period: '2025-04',
          archiveType: 'detached-partition',
          rowCount: 100n,
          sizeBytes: 2048n,
          detachedAt: new Date('2026-06-01T00:00:00Z'),
          reattachedAt: null,
        },
      ]);

      const [row] = await service.listArchives();

      expect(row).toEqual({
        id: 1,
        tableName: 'trip_y2025m04',
        period: '2025-04',
        archiveType: 'detached-partition',
        rowCount: 100,
        sizeBytes: 2048,
        detachedAt: '2026-06-01T00:00:00.000Z',
        reattachedAt: null,
      });
    });

    it('passes through a null size and a set re-attach timestamp', async () => {
      repo.listCatalog.mockResolvedValue([
        {
          id: 2,
          tableName: 'haul_y2025m04',
          period: '2025-04',
          archiveType: 'detached-partition',
          rowCount: 5n,
          sizeBytes: null,
          detachedAt: new Date('2026-06-01T00:00:00Z'),
          reattachedAt: new Date('2026-06-05T00:00:00Z'),
        },
      ]);

      const [row] = await service.listArchives();

      expect(row).toMatchObject({ sizeBytes: null, reattachedAt: '2026-06-05T00:00:00.000Z' });
    });
  });
});
