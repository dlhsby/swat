import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type Job } from 'bullmq';

import { type DateRangeQueryDto } from '../monitoring/dto/date-range.query.dto';
import { type FuelConsumptionQueryDto } from '../monitoring/dto/fuel.query.dto';
import { type TonnageBySourceQueryDto } from '../monitoring/dto/tonnage-source.query.dto';
import { MonitoringService } from '../monitoring/monitoring.service';
import { PrismaService } from '../prisma/prisma.service';

import { FuelReportBuilder } from './builders/fuel-report.builder';
import { LevyReportBuilder } from './builders/levy-report.builder';
import { type ReportDataset, PdfReportBuilder } from './builders/pdf-report.builder';
import { RouteReportBuilder } from './builders/route-report.builder';
import { TonnageReportBuilder } from './builders/tonnage-report.builder';
import { ReportStorageService } from './report-storage.service';
import {
  type ReportFilters,
  type ReportFormat,
  type ReportJobPayload,
  type ReportType,
  REPORTS_QUEUE,
} from './report.types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * BullMQ processor: renders a queued report and stores it. Status transitions
 * QUEUED → PROCESSING → COMPLETED (or FAILED, with the error recorded and the
 * job rethrown so BullMQ applies its retry/backoff). Data is fetched through the
 * existing {@link MonitoringService} (rollup-backed, cached) — no new queries.
 */
@Processor(REPORTS_QUEUE)
export class ReportGenerationWorker extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly monitoring: MonitoringService,
    private readonly storage: ReportStorageService,
    private readonly tonnageBuilder: TonnageReportBuilder,
    private readonly fuelBuilder: FuelReportBuilder,
    private readonly routeBuilder: RouteReportBuilder,
    private readonly levyBuilder: LevyReportBuilder,
    private readonly pdfBuilder: PdfReportBuilder,
  ) {
    super();
  }

  async process(job: Job<ReportJobPayload>): Promise<void> {
    const { jobId } = job.data;
    const record = await this.prisma.reportJob.findUnique({ where: { id: jobId } });
    if (!record) {
      // Cancelled/deleted before processing — nothing to do.
      return;
    }
    const reportType = record.reportType as ReportType;
    const format = record.format as ReportFormat;
    const filters = record.filters as unknown as ReportFilters;

    try {
      await this.prisma.reportJob.update({ where: { id: jobId }, data: { status: 'PROCESSING' } });
      const data = await this.fetchData(reportType, filters);
      const buffer =
        format === 'xlsx'
          ? await this.buildExcel(reportType, data)
          : await this.pdfBuilder.build(reportType, data);
      const { objectKey, size } = await this.storage.upload(jobId, reportType, format, buffer);
      await this.prisma.reportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          objectKey,
          fileSize: BigInt(size),
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
          errorMessage: null,
        },
      });
      this.logger.log(`Report ${jobId} (${reportType}/${format}) completed — ${size} bytes`);
    } catch (err) {
      // The job may have been cancelled (row deleted) mid-render — treat a
      // missing row as a clean cancel: don't retry, don't surface an error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        this.logger.warn(`Report ${jobId} cancelled mid-generation (row removed).`);
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      // Record the failure, but if the row is gone here too, swallow it (cancelled).
      try {
        await this.prisma.reportJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', errorMessage: message.slice(0, 500) },
        });
      } catch (updateErr) {
        if (
          updateErr instanceof Prisma.PrismaClientKnownRequestError &&
          updateErr.code === 'P2025'
        ) {
          this.logger.warn(`Report ${jobId} cancelled before failure could be recorded.`);
          return;
        }
        throw updateErr;
      }
      this.logger.error(`Report ${jobId} failed: ${message}`);
      throw err; // let BullMQ apply retry/backoff
    }
  }

  private async fetchData(reportType: ReportType, filters: ReportFilters): Promise<ReportDataset> {
    const range = { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
    switch (reportType) {
      case 'tonnage': {
        const [monthly, daily, bySource, bySite] = await Promise.all([
          this.monitoring.tonnageMonthly(range as DateRangeQueryDto),
          this.monitoring.tonnage5Day(range as DateRangeQueryDto),
          this.monitoring.tonnageBySource(range as TonnageBySourceQueryDto),
          this.monitoring.tonnageBySite(range as DateRangeQueryDto),
        ]);
        return { ...range, monthly, daily, bySource, bySite };
      }
      case 'fuel': {
        const [consumption, byType] = await Promise.all([
          this.monitoring.fuelConsumption({
            ...range,
            vehicleId: filters.vehicleId,
          } as FuelConsumptionQueryDto),
          this.monitoring.fuelByType(range as DateRangeQueryDto),
        ]);
        return { ...range, consumption, byType };
      }
      case 'route': {
        const routes = await this.monitoring.routesActive(range as DateRangeQueryDto);
        return { ...range, routes };
      }
      case 'levy': {
        const [summary, trend, byCategoryMonth] = await Promise.all([
          this.monitoring.levySummary(range as DateRangeQueryDto),
          this.monitoring.levyTrend(range as DateRangeQueryDto),
          this.monitoring.levyByCategoryMonth(range as DateRangeQueryDto),
        ]);
        return { ...range, summary, trend, byCategoryMonth };
      }
    }
  }

  private buildExcel(reportType: ReportType, data: ReportDataset): Promise<Buffer> {
    switch (reportType) {
      case 'tonnage':
        return this.tonnageBuilder.build(data as Parameters<TonnageReportBuilder['build']>[0]);
      case 'fuel':
        return this.fuelBuilder.build(data as Parameters<FuelReportBuilder['build']>[0]);
      case 'route':
        return this.routeBuilder.build(data as Parameters<RouteReportBuilder['build']>[0]);
      case 'levy':
        return this.levyBuilder.build(data as Parameters<LevyReportBuilder['build']>[0]);
    }
  }
}
