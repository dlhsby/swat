'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { ReportStatusDialog } from '@/components/reports/report-status-dialog';
import { PageHead } from '@/components/shell/page-head';
import {
  Button,
  Card,
  RadioGroup,
  RadioGroupItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { notify } from '@/components/ui/toast';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { ApiError } from '@/lib/api-error';
import { type ReportFormat, type ReportType, reportsApi } from '@/lib/reports-api';

const REPORT_TYPES: readonly ReportType[] = ['tonnage', 'fuel', 'route', 'levy'];

export default function ReportsPage(): JSX.Element {
  const t = useTranslations('reports');
  const { range, setRange, today } = useMonitoringRange();
  const [activeTab, setActiveTab] = useState<ReportType>('tonnage');
  const [format, setFormat] = useState<ReportFormat>('xlsx');
  const [jobId, setJobId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async (): Promise<void> => {
    setGenerating(true);
    try {
      const res = await reportsApi.generate(activeTab, { ...range, format });
      setJobId(res.jobId);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : t('generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />

      <div className="mt-4 space-y-4">
        <DateRangeControl value={range} today={today} onChange={setRange} />

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
            <TabsList>
              {REPORT_TYPES.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {t(`tabs.${type}`)}
                </TabsTrigger>
              ))}
            </TabsList>

            {REPORT_TYPES.map((type) => (
              <TabsContent key={type} value={type} className="pt-4">
                <p className="text-body-sm text-neutral-600">{t(`description.${type}`)}</p>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6 space-y-2">
            <p className="text-label font-medium text-neutral-900">{t('format')}</p>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ReportFormat)}
              className="flex gap-6"
            >
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                <span className="text-body-sm">{t('formatXlsx')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <span className="text-body-sm">{t('formatPdf')}</span>
              </label>
            </RadioGroup>
          </div>

          <div className="mt-6">
            <ProtectedAction permission="report:generate">
              <Button onClick={generate} loading={generating}>
                {t('generate')}
              </Button>
            </ProtectedAction>
          </div>
        </Card>
      </div>

      <ReportStatusDialog jobId={jobId} onClose={() => setJobId(null)} />
    </>
  );
}
