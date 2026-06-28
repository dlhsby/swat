import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma, type ReportJob } from '@prisma/client';
import { type Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';

import {
  type ReportFilters,
  type ReportFormat,
  type ReportJobPayload,
  type ReportType,
  REPORTS_QUEUE,
} from './report.types';

/**
 * Report job producer: persists a QUEUED {@link ReportJob} row, then enqueues a
 * BullMQ job carrying only its id (the worker re-reads the row for fresh state).
 * Retries up to 3× with exponential backoff; failed jobs are kept for inspection.
 */
@Injectable()
export class ReportJobQueue {
  constructor(
    @InjectQueue(REPORTS_QUEUE) private readonly queue: Queue<ReportJobPayload>,
    private readonly prisma: PrismaService,
  ) {}

  async enqueue(
    reportType: ReportType,
    format: ReportFormat,
    filters: ReportFilters,
    userId: string,
  ): Promise<ReportJob> {
    const job = await this.prisma.reportJob.create({
      data: {
        userId,
        reportType,
        format,
        status: 'QUEUED',
        filters: filters as unknown as Prisma.InputJsonObject,
      },
    });
    await this.queue.add(
      'generate',
      { jobId: job.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    return job;
  }
}
