'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@/components/ui';
import { notify } from '@/components/ui/toast';
import { useReportJobStatus } from '@/hooks/use-reports';
import { ApiError } from '@/lib/api-error';
import { reportsApi } from '@/lib/reports-api';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Polls a queued report and surfaces its progress. On COMPLETED it offers a
 * Download button (fetches a fresh presigned URL on click); on FAILED it shows
 * the error. Closing resets the parent's jobId.
 */
export function ReportStatusDialog({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: () => void;
}): JSX.Element {
  const t = useTranslations('reports');
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading } = useReportJobStatus(jobId);
  const status = data?.status;
  const isDone = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  const download = async (): Promise<void> => {
    if (!jobId) return;
    setDownloading(true);
    try {
      const { url } = await reportsApi.download(jobId);
      // Navigate to the presigned URL (served with Content-Disposition:
      // attachment) — a top-level navigation isn't subject to the popup blocker
      // the way window.open() from an async handler is, and the browser downloads.
      window.location.assign(url);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : t('downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={jobId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('statusTitle')}</DialogTitle>
          <DialogDescription>
            {isDone ? t('ready') : isFailed ? t('failed') : t('generating')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          {!isDone && !isFailed && <Spinner />}
          <div>
            <p className="text-tiny text-neutral-600">{t('statusLabel')}</p>
            <p className="text-body font-semibold text-neutral-900">
              {isLoading || !status ? t('status.QUEUED') : t(`status.${status}`)}
              {isDone && data?.fileSize ? ` · ${formatBytes(data.fileSize)}` : ''}
            </p>
          </div>
        </div>

        {isFailed && <Alert variant="danger">{data?.errorMessage ?? t('failed')}</Alert>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
          {isDone && (
            <Button onClick={download} loading={downloading}>
              {t('download')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
