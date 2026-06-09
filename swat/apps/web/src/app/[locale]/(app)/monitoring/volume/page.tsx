'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Layers, Scale, Truck, Weight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChartCard } from '@/components/monitoring/chart-card';
import { SourceDonut } from '@/components/monitoring/charts/source-donut';
import { TonnageColumns } from '@/components/monitoring/charts/tonnage-columns';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { PageHead } from '@/components/shell/page-head';
import { Alert, Badge, Button, DataTable, MetricCard } from '@/components/ui';
import { useTonnage5Day, useTonnageBySite, useTonnageBySource } from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { formatNumber, formatWeight } from '@/lib/format';
import { type DailyTonnageRow, type Ownership, type TonnageBySiteRow } from '@/lib/monitoring-api';
import { kgToTon, sourceComposition, tonnageTrend } from '@/lib/monitoring-charts';
import { type PillVariant } from '@/lib/status-pill';

type SourceTab = 'TOTAL' | 'DINAS' | 'SWASTA';

const RECON_VARIANT: Record<string, PillVariant> = {
  MATCHED: 'green',
  DISCREPANCY: 'red',
  PENDING: 'slate',
};

export default function VolumePage(): JSX.Element {
  const t = useTranslations('monitoring.volume');
  const tRecon = useTranslations('monitoring.recon');
  const tCommon = useTranslations('monitoring.common');
  const { range, setRange, today } = useMonitoringRange();
  const [tab, setTab] = useState<SourceTab>('TOTAL');
  const ownership: Ownership | undefined = tab === 'TOTAL' ? undefined : tab;

  const daily = useTonnage5Day(range);
  const bySource = useTonnageBySource(range, ownership);
  const bySite = useTonnageBySite(range);

  const dailyRows = daily.data ?? [];
  const totalKg = dailyRows.reduce((sum, row) => sum + row.totalTonnageKg, 0);
  const totalHauls = dailyRows.reduce((sum, row) => sum + row.haulCount, 0);
  const composition = sourceComposition(bySource.data ?? []);

  const dailyColumns: ColumnDef<DailyTonnageRow>[] = [
    { accessorKey: 'date', header: t('colDate') },
    {
      accessorKey: 'totalTonnageKg',
      header: t('colTonnage'),
      cell: ({ row }) => formatWeight(row.original.totalTonnageKg),
    },
    { accessorKey: 'haulCount', header: t('colHauls') },
    {
      accessorKey: 'tpaInboundKg',
      header: t('colTpa'),
      cell: ({ row }) =>
        row.original.tpaInboundKg === null ? '—' : formatWeight(row.original.tpaInboundKg),
    },
    {
      accessorKey: 'reconciliationStatus',
      header: t('colStatus'),
      cell: ({ row }) => (
        <Badge variant={RECON_VARIANT[row.original.reconciliationStatus] ?? 'slate'}>
          {tRecon(row.original.reconciliationStatus)}
        </Badge>
      ),
    },
  ];

  const siteColumns: ColumnDef<TonnageBySiteRow>[] = [
    { accessorKey: 'name', header: t('colSite') },
    {
      accessorKey: 'totalTonnageKg',
      header: t('colTonnage'),
      cell: ({ row }) => formatWeight(row.original.totalTonnageKg),
    },
    { accessorKey: 'haulCount', header: t('colHauls') },
  ];

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />
      <DateRangeControl value={range} today={today} onChange={setRange} />

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Weight}
          label={t('kpiTotal')}
          value={formatNumber(kgToTon(totalKg))}
          unit="ton"
          loading={daily.isLoading}
        />
        <MetricCard
          icon={Truck}
          label={t('kpiHauls')}
          value={formatNumber(totalHauls)}
          unit="haul"
          loading={daily.isLoading}
        />
        <MetricCard
          icon={Scale}
          label={t('kpiAvg')}
          value={formatNumber(totalHauls === 0 ? 0 : kgToTon(totalKg / totalHauls))}
          unit="ton"
          loading={daily.isLoading}
        />
        <MetricCard
          icon={Layers}
          label={t('kpiSources')}
          value={formatNumber((bySource.data ?? []).length)}
          unit={t('sourceLabel').toLowerCase()}
          loading={bySource.isLoading}
        />
      </div>

      <Alert variant="info" className="mt-4">
        {t('infoNote')}
      </Alert>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title={t('chartTitle')} subtitle={t('chartSub')}>
            {dailyRows.length === 0 ? (
              <p className="py-12 text-center text-body-sm text-neutral-500">{tCommon('empty')}</p>
            ) : (
              <TonnageColumns data={tonnageTrend(dailyRows)} />
            )}
          </ChartCard>
        </div>
        <ChartCard
          title={t('donutTitle')}
          right={
            <div className="flex gap-1">
              {(['TOTAL', 'DINAS', 'SWASTA'] as const).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={tab === key ? 'primary' : 'outline'}
                  onClick={() => setTab(key)}
                >
                  {t(`source${key === 'TOTAL' ? 'Total' : key === 'DINAS' ? 'Dinas' : 'Swasta'}`)}
                </Button>
              ))}
            </div>
          }
        >
          {composition.slices.length === 0 ? (
            <p className="py-12 text-center text-body-sm text-neutral-500">{tCommon('empty')}</p>
          ) : (
            <SourceDonut slices={composition.slices} />
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('tableTitle')}>
          <DataTable
            columns={siteColumns}
            data={bySite.data ?? []}
            loading={bySite.isLoading}
            error={bySite.isError}
            emptyTitle={tCommon('empty')}
          />
        </ChartCard>
        <ChartCard title={t('colStatus')}>
          <DataTable
            columns={dailyColumns}
            data={dailyRows}
            loading={daily.isLoading}
            error={daily.isError}
            emptyTitle={tCommon('empty')}
          />
        </ChartCard>
      </div>
    </>
  );
}
