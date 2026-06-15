import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { type GenerateReportDto } from '../dto/generate-report.dto';
import { type ReportJobQueue } from '../report-job.queue';
import { type ReportStorageService } from '../report-storage.service';
import { ReportsService } from '../reports.service';

const OWNER = 'user-1';
const OTHER = 'user-2';

function build(jobOverrides: Record<string, unknown> | null) {
  const prisma = {
    reportJob: {
      findUnique: jest.fn().mockResolvedValue(jobOverrides),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue({ id: 'job-1', status: 'QUEUED' }),
  } as unknown as ReportJobQueue;
  const storage = {
    getDownloadUrl: jest.fn().mockResolvedValue('https://minio/signed'),
    deleteReport: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReportStorageService;
  const service = new ReportsService(prisma as never, queue, storage);
  return { service, prisma, queue, storage };
}

const completedJob = {
  id: 'job-1',
  userId: OWNER,
  reportType: 'tonnage',
  format: 'xlsx',
  status: 'COMPLETED',
  objectKey: 'reports/job-1/tonnage.xlsx',
  fileSize: BigInt(2048),
  errorMessage: null,
  createdAt: new Date(),
  completedAt: new Date(),
  expiresAt: new Date(Date.now() + 86_400_000),
};

describe('ReportsService', () => {
  it('enqueues a job and returns the id + ETA', async () => {
    const { service, queue } = build(null);
    const dto = {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      format: 'xlsx',
    } as GenerateReportDto;
    const res = await service.generate('tonnage', dto, OWNER);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'tonnage',
      'xlsx',
      expect.objectContaining({ dateFrom: '2026-01-01', dateTo: '2026-01-31' }),
      OWNER,
    );
    expect(res.jobId).toBe('job-1');
    expect(res.estimatedCompletionAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('400s an inverted date range before enqueueing', async () => {
    const { service, queue } = build(null);
    const dto = {
      dateFrom: '2026-02-01',
      dateTo: '2026-01-01',
      format: 'xlsx',
    } as GenerateReportDto;
    await expect(service.generate('tonnage', dto, OWNER)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('404s a missing job and 403s another user’s job', async () => {
    await expect(build(null).service.getJob('x', OWNER)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      build({ ...completedJob, userId: OTHER }).service.getJob('job-1', OWNER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a presigned URL for a completed, owned, unexpired report', async () => {
    const { service, storage } = build(completedJob);
    const res = await service.getDownloadUrl('job-1', OWNER);
    expect(res.url).toBe('https://minio/signed');
    expect(storage.getDownloadUrl).toHaveBeenCalledWith(
      completedJob.objectKey,
      1800,
      expect.stringContaining('laporan-tonnage'),
    );
  });

  it('409s a not-yet-completed report and 404s an expired one', async () => {
    await expect(
      build({ ...completedJob, status: 'PROCESSING', objectKey: null }).service.getDownloadUrl(
        'job-1',
        OWNER,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      build({ ...completedJob, expiresAt: new Date(Date.now() - 1000) }).service.getDownloadUrl(
        'job-1',
        OWNER,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes the artifact and the row on delete', async () => {
    const { service, storage, prisma } = build(completedJob);
    await service.remove('job-1', OWNER);
    expect(storage.deleteReport).toHaveBeenCalledWith(completedJob.objectKey);
    expect(prisma.reportJob.delete).toHaveBeenCalledWith({ where: { id: 'job-1' } });
  });
});
