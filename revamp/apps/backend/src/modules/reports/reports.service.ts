import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { type GenerateReportDto } from './dto/generate-report.dto';
import { ReportJobQueue } from './report-job.queue';
import { ReportStorageService } from './report-storage.service';
import { type ReportFilters, type ReportType } from './report.types';

export interface ReportJobView {
  jobId: string;
  reportType: string;
  format: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  fileSize: number | null;
  errorMessage: string | null;
}

/** Rough ETA so the UI can show a progress hint (worker targets ≤30s even for a year). */
const ESTIMATED_SECONDS = 15;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ReportJobQueue,
    private readonly storage: ReportStorageService,
  ) {}

  async generate(
    reportType: ReportType,
    dto: GenerateReportDto,
    userId: string,
  ): Promise<{ jobId: string; status: string; estimatedCompletionAt: string }> {
    // The shared date DTO validates each date but not their order; an inverted
    // window would silently produce an empty report, so reject it up front.
    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException('dateFrom harus lebih awal atau sama dengan dateTo.');
    }
    const filters: ReportFilters = {
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      wasteSourceId: dto.wasteSourceId,
      siteId: dto.siteId,
      vehicleId: dto.vehicleId,
      fuelTypeId: dto.fuelTypeId,
      categoryId: dto.categoryId,
    };
    const job = await this.queue.enqueue(reportType, dto.format, filters, userId);
    return {
      jobId: job.id,
      status: job.status,
      estimatedCompletionAt: new Date(Date.now() + ESTIMATED_SECONDS * 1000).toISOString(),
    };
  }

  async getJob(jobId: string, userId: string): Promise<ReportJobView> {
    const job = await this.ownedJob(jobId, userId);
    return {
      jobId: job.id,
      reportType: job.reportType,
      format: job.format,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      expiresAt: job.expiresAt,
      fileSize: job.fileSize === null ? null : Number(job.fileSize),
      errorMessage: job.errorMessage,
    };
  }

  /** Presigned download URL for a COMPLETED, non-expired report owned by the caller. */
  async getDownloadUrl(jobId: string, userId: string): Promise<{ url: string; expiresIn: number }> {
    const job = await this.ownedJob(jobId, userId);
    if (job.status !== 'COMPLETED' || !job.objectKey) {
      throw new ConflictException('Laporan belum siap diunduh.');
    }
    if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Laporan sudah kedaluwarsa.');
    }
    const expiresIn = 1800;
    const ext = job.format === 'pdf' ? 'pdf' : 'xlsx';
    const filename = `laporan-${job.reportType}-${job.createdAt.toISOString().slice(0, 10)}.${ext}`;
    return {
      url: await this.storage.getDownloadUrl(job.objectKey, expiresIn, filename),
      expiresIn,
    };
  }

  /** Cancel/remove a job: delete the artifact (if any) and the row. */
  async remove(jobId: string, userId: string): Promise<void> {
    const job = await this.ownedJob(jobId, userId);
    if (job.objectKey) {
      await this.storage.deleteReport(job.objectKey).catch(() => undefined);
    }
    await this.prisma.reportJob.delete({ where: { id: job.id } });
  }

  private async ownedJob(jobId: string, userId: string) {
    const job = await this.prisma.reportJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Laporan tidak ditemukan.');
    }
    if (job.userId !== userId) {
      throw new ForbiddenException('Anda tidak berhak mengakses laporan ini.');
    }
    return job;
  }
}
