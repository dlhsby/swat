/**
 * Shared types for the async report engine (Phase 3). `ReportFilters` is stored
 * verbatim on `ReportJob.filters` (Json) and replayed by the worker into the
 * matching {@link MonitoringService} method, so its date fields mirror
 * `DateRangeQueryDto` (`dateFrom`/`dateTo`, `YYYY-MM-DD`).
 */
export const REPORT_TYPES = ['tonnage', 'fuel', 'route', 'levy'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FORMATS = ['xlsx', 'pdf'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export type ReportJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  /** Tonnage by-source filter. */
  wasteSourceId?: string;
  /** Tonnage by-site filter. */
  siteId?: string;
  /** Fuel by-vehicle filter. */
  vehicleId?: string;
  /** Fuel by-type filter. */
  fuelTypeId?: string;
  /** Levy by-category filter. */
  categoryId?: string;
}

/** BullMQ job payload — only the id; the worker re-reads the row for fresh state. */
export interface ReportJobPayload {
  jobId: string;
}

export const REPORTS_QUEUE = 'reports';

/** MIME + extension per format. */
export const FORMAT_META: Record<ReportFormat, { ext: string; contentType: string }> = {
  xlsx: {
    ext: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  pdf: { ext: 'pdf', contentType: 'application/pdf' },
};
