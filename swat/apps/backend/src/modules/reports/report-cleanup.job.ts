import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

import { ReportStorageService } from './report-storage.service';

/**
 * Nightly TTL cleanup (03:00): deletes the artifact + row for every COMPLETED
 * report past its `expiresAt` (7-day TTL). A MinIO bucket lifecycle rule on
 * `swat-reports` is the backstop if this job is ever missed.
 */
@Injectable()
export class ReportCleanupJob {
  private readonly logger = new Logger(ReportCleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ReportStorageService,
  ) {}

  @Cron('0 3 * * *')
  async cleanup(): Promise<void> {
    const expired = await this.prisma.reportJob.findMany({
      where: { status: 'COMPLETED', expiresAt: { lt: new Date() } },
      select: { id: true, objectKey: true, fileSize: true },
    });
    let deleted = 0;
    let freedBytes = 0;
    for (const job of expired) {
      if (job.objectKey) {
        await this.storage.deleteReport(job.objectKey).catch((err: unknown) => {
          this.logger.warn(
            `Failed to delete object ${job.objectKey ?? ''}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });
      }
      await this.prisma.reportJob.delete({ where: { id: job.id } }).catch(() => undefined);
      deleted += 1;
      freedBytes += Number(job.fileSize ?? 0);
    }
    if (deleted > 0) {
      this.logger.log(`Report cleanup: ${deleted} expired deleted, ${freedBytes} bytes freed.`);
    }
  }
}
