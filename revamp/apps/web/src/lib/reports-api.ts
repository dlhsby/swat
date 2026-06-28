import { apiClient } from './api-client';
import { type DateRange } from './monitoring-api';

/**
 * Typed client for the Phase-3 report engine (backend Epic 3.5). Generation is
 * async: POST returns a job id (202), the UI polls the job, then fetches a
 * short-lived presigned download URL once COMPLETED.
 */
export type ReportType = 'tonnage' | 'fuel' | 'route' | 'levy';
export type ReportFormat = 'xlsx' | 'pdf';
export type ReportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface GenerateReportRequest extends DateRange {
  readonly format: ReportFormat;
  /** Optional per-type filters the backend GenerateReportDto already accepts. */
  readonly vehicleId?: string;
  readonly wasteSourceId?: string;
  readonly siteId?: string;
  readonly fuelTypeId?: string;
  readonly categoryId?: string;
}

export interface GenerateReportResponse {
  readonly jobId: string;
  readonly status: ReportStatus;
  readonly estimatedCompletionAt: string;
}

export interface ReportJobStatus {
  readonly jobId: string;
  readonly reportType: ReportType;
  readonly format: ReportFormat;
  readonly status: ReportStatus;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly expiresAt: string | null;
  readonly fileSize: number | null;
  readonly errorMessage: string | null;
}

export const reportsApi = {
  generate: (type: ReportType, req: GenerateReportRequest): Promise<GenerateReportResponse> =>
    apiClient.post(`/reports/${type}/generate`, { ...req }),

  jobStatus: (jobId: string): Promise<ReportJobStatus> => apiClient.get(`/reports/jobs/${jobId}`),

  download: (jobId: string): Promise<{ url: string; expiresIn: number }> =>
    apiClient.get(`/reports/download/${jobId}`),
};
