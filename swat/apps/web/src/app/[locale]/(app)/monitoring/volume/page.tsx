'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Layers, Scale, Truck, Weight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChartCard } from '@/components/monitoring/chart-card';
import { SourceDonut } from '@/components/monitoring/charts/source-donut';
import { TonnageColumns } from '@/components/monitoring/charts/tonnage-columns';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { ExportMenu } from '@/components/monitoring/export-menu';
import { PageHead } from '@/components/shell/page-head';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  MetricCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  useTonnage5Day,
  useTonnageBySite,
  useTonnageBySource,
  useTonnageMonthly,
} from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { formatNumber, formatWeight } from '@/lib/format';
import {
  type DailyTonnageRow,
  type SourceGroup,
  type TonnageBySiteRow,
  type TonnageBySourceRow,
} from '@/lib/monitoring-api';
import {
  kgToTon,
  monthlyTonnageTrend,
  sourceComposition,
  tonnageTrend,
} from '@/lib/monitoring-charts';
import { type PillVariant } from '@/lib/status-pill';

type SourceTab = 'SEMUA' | 'NON_SWASTA' | 'SWASTA';

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
  const [tab, setTab] = useState<SourceTab>('SEMUA');
  const group: SourceGroup | undefined = tab === 'SEMUA' ? undefined : tab;

  const daily = useTonnage5Day(range);
  const monthly = useTonnageMonthly(range);
  const bySource = useTonnageBySource(range, group);
  const bySite = useTonnageBySite(range);

  const dailyRows = daily.data ?? [];
  const totalKg = dailyRows.reduce((sum, row) => sum + row.totalTonnageKg, 0);
  const totalHauls = dailyRows.reduce((sum, row) => sum + row.haulCount, 0);
  const composition = sourceComposition(bySource.data ?? []);
  const monthlyPoints = monthlyTonnageTrend(monthly.data ?? []);

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

  const sourceColumns: ColumnDef<TonnageBySourceRow>[] = [
    { accessorKey: 'code', header: t('colCode') },
    { accessorKey: 'name', header: t('colSource') },
    {
      accessorKey: 'totalTonnageKg',
      header: t('colTonnage'),
      cell: ({ row }) => formatWeight(row.original.totalTonnageKg),
    },
    { accessorKey: 'haulCount', header: t('colHauls') },
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeControl value={range} today={today} onChange={setRange} />
        <ExportMenu type="tonnage" range={range} />
      </div>

      <Tabs defaultValue="summary" className="mt-4">
        <TabsList>
          <TabsTrigger value="summary">{t('tabSummary')}</TabsTrigger>
          <TabsTrigger value="recap">{t('tabRecap')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              unit="angkut sampah"
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
                  <p className="py-12 text-center text-body-sm text-neutral-500">
                    {tCommon('empty')}
                  </p>
                ) : (
                  <TonnageColumns data={tonnageTrend(dailyRows)} />
                )}
              </ChartCard>
            </div>
            <ChartCard
              title={t('donutTitle')}
              footer={<p className="text-caption text-neutral-400">{tCommon('monthNote')}</p>}
              right={
                <div className="flex w-full min-w-[180px] gap-1">
                  {(
                    [
                      ['SEMUA', 'sourceAll'],
                      ['NON_SWASTA', 'sourceNonSwasta'],
                      ['SWASTA', 'sourceSwasta'],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={tab === key ? 'primary' : 'outline'}
                      onClick={() => setTab(key)}
                      className="flex-1 whitespace-nowrap px-2"
                    >
                      {t(label)}
                    </Button>
                  ))}
                </div>
              }
            >
              {composition.slices.length === 0 ? (
                <p className="py-12 text-center text-body-sm text-neutral-500">
                  {tCommon('empty')}
                </p>
              ) : (
                <SourceDonut slices={composition.slices} />
              )}
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={t('chartMonthlyTitle')}
              footer={<p className="text-caption text-neutral-400">{tCommon('monthNote')}</p>}
            >
              {monthlyPoints.length === 0 ? (
                <p className="py-12 text-center text-body-sm text-neutral-500">
                  {tCommon('empty')}
                </p>
              ) : (
                <TonnageColumns data={monthlyPoints} />
              )}
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
        </TabsContent>

        <TabsContent value="recap">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={t('tableBySourceTitle')}
              footer={<p className="text-caption text-neutral-400">{tCommon('monthNote')}</p>}
            >
              <DataTable
                columns={sourceColumns}
                data={bySource.data ?? []}
                loading={bySource.isLoading}
                error={bySource.isError}
                emptyTitle={tCommon('empty')}
              />
            </ChartCard>
            <ChartCard
              title={t('tableTitle')}
              footer={<p className="text-caption text-neutral-400">{tCommon('monthNote')}</p>}
            >
              <DataTable
                columns={siteColumns}
                data={bySite.data ?? []}
                loading={bySite.isLoading}
                error={bySite.isError}
                emptyTitle={tCommon('empty')}
              />
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
