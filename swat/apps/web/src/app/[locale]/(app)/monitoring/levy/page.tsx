'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Coins, Receipt, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ChartCard } from '@/components/monitoring/chart-card';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { PageHead } from '@/components/shell/page-head';
import { Alert, DataTable, MetricCard } from '@/components/ui';
import { useLevySummary } from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { formatNumber, formatRupiah } from '@/lib/format';
import { type LevySummaryRow } from '@/lib/monitoring-api';

export default function LevyPage(): JSX.Element {
  const t = useTranslations('monitoring.levy');
  const tCommon = useTranslations('monitoring.common');
  const { range, setRange, today } = useMonitoringRange();
  const levy = useLevySummary(range);

  const rows = levy.data ?? [];
  const total = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const count = rows.reduce((sum, row) => sum + row.transactionCount, 0);

  const columns: ColumnDef<LevySummaryRow>[] = [
    { accessorKey: 'categoryName', header: t('colCategory') },
    {
      accessorKey: 'totalAmount',
      header: t('colTotal'),
      cell: ({ row }) => formatRupiah(row.original.totalAmount),
    },
    { accessorKey: 'transactionCount', header: t('colCount') },
    {
      accessorKey: 'avgPerTransaction',
      header: t('colAvg'),
      cell: ({ row }) => formatRupiah(row.original.avgPerTransaction),
    },
  ];

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />
      <DateRangeControl value={range} today={today} onChange={setRange} />

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label={t('kpiTotal')}
          value={formatRupiah(total)}
          unit=""
          loading={levy.isLoading}
        />
        <MetricCard
          icon={Receipt}
          label={t('kpiCount')}
          value={formatNumber(count)}
          unit="transaksi"
          loading={levy.isLoading}
        />
        <MetricCard
          icon={Coins}
          label={t('kpiAvg')}
          value={formatRupiah(count === 0 ? 0 : Math.round(total / count))}
          unit=""
          loading={levy.isLoading}
        />
      </div>

      <Alert variant="info" className="mt-4">
        {t('note')}
      </Alert>

      <div className="mt-4">
        <ChartCard title={t('tableTitle')}>
          <DataTable
            columns={columns}
            data={rows}
            loading={levy.isLoading}
            error={levy.isError}
            emptyTitle={tCommon('empty')}
          />
        </ChartCard>
      </div>
    </>
  );
}
