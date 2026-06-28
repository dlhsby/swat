import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/config.service';
import { StorageService } from '../storage/storage.service';

import { FORMAT_META, type ReportFormat, type ReportType } from './report.types';

/**
 * Report artifact storage — a thin wrapper over {@link StorageService} bound to
 * the dedicated `swat-reports` bucket (kept apart from the permanent photo
 * bucket; ephemeral with a 7-day TTL). Object key is derived from the job id.
 */
@Injectable()
export class ReportStorageService {
  private readonly bucket: string;

  constructor(
    private readonly storage: StorageService,
    config: AppConfigService,
  ) {
    this.bucket = config.storage.reportsBucket;
  }

  objectKey(jobId: string, reportType: ReportType, format: ReportFormat): string {
    return `reports/${jobId}/${reportType}.${FORMAT_META[format].ext}`;
  }

  /** Upload a generated report; returns the stored key + byte size. */
  async upload(
    jobId: string,
    reportType: ReportType,
    format: ReportFormat,
    buffer: Buffer,
  ): Promise<{ objectKey: string; size: number }> {
    const objectKey = this.objectKey(jobId, reportType, format);
    await this.storage.uploadObject(
      objectKey,
      buffer,
      FORMAT_META[format].contentType,
      this.bucket,
    );
    return { objectKey, size: buffer.length };
  }

  /** Short-lived presigned GET URL for downloading a completed report. Forces an
   * attachment disposition with a friendly filename so the browser downloads
   * (both xlsx and pdf) rather than navigating/previewing. */
  getDownloadUrl(objectKey: string, expiresIn = 1800, filename?: string): Promise<string> {
    const disposition = filename
      ? `attachment; filename="${filename.replace(/"/g, '')}"`
      : undefined;
    return this.storage.getPresignedGetUrl(objectKey, expiresIn, this.bucket, disposition);
  }

  deleteReport(objectKey: string): Promise<void> {
    return this.storage.deleteObject(objectKey, this.bucket);
  }
}
