'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { ReportStatusDialog } from '@/components/reports/report-status-dialog';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { notify } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { type DateRange } from '@/lib/monitoring-api';
import { type ReportFormat, type ReportType, reportsApi } from '@/lib/reports-api';

/** Optional per-type filters forwarded verbatim to the backend report engine. */
export interface ReportFilters {
  readonly vehicleId?: string;
  readonly wasteSourceId?: string;
  readonly siteId?: string;
  readonly fuelTypeId?: string;
  readonly categoryId?: string;
}

/**
 * Per-page "Ekspor" control for the monitoring dashboards. Queues an async report
 * (Excel/PDF) for the current date range + filters via the existing report engine,
 * then surfaces progress/download through the shared {@link ReportStatusDialog}.
 * Hidden entirely for users without `report:generate`.
 */
export function ExportMenu({
  type,
  range,
  filters,
}: {
  type: ReportType;
  range: DateRange;
  filters?: ReportFilters;
}): JSX.Element {
  const t = useTranslations('reports');
  const [jobId, setJobId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async (format: ReportFormat): Promise<void> => {
    setGenerating(true);
    try {
      const res = await reportsApi.generate(type, { ...range, format, ...filters });
      setJobId(res.jobId);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : t('generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ProtectedAction permission="report:generate">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" loading={generating}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {t('export')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void generate('xlsx')}>
            {t('formatXlsx')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void generate('pdf')}>{t('formatPdf')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportStatusDialog jobId={jobId} onClose={() => setJobId(null)} />
    </ProtectedAction>
  );
}
