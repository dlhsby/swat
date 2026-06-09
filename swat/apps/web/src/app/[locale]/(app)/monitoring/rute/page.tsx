'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { MapPin, Route as RouteIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ChartCard } from '@/components/monitoring/chart-card';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { PageHead } from '@/components/shell/page-head';
import { DataTable, MetricCard } from '@/components/ui';
import { useRoutesActive } from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { formatDistance, formatNumber } from '@/lib/format';
import { type RouteActivityRow } from '@/lib/monitoring-api';

export default function RoutesPage(): JSX.Element {
  const t = useTranslations('monitoring.routes');
  const tCommon = useTranslations('monitoring.common');
  const { range, setRange, today } = useMonitoringRange();
  const routes = useRoutesActive(range);

  const rows = routes.data ?? [];
  const totalTrips = rows.reduce((sum, row) => sum + row.tripCount, 0);

  const columns: ColumnDef<RouteActivityRow>[] = [
    {
      accessorKey: 'originSiteName',
      header: t('colRoute'),
      cell: ({ row }) => `${row.original.originSiteName} → ${row.original.destinationSiteName}`,
    },
    { accessorKey: 'category', header: t('colCategory') },
    {
      accessorKey: 'distanceKm',
      header: t('colDistance'),
      cell: ({ row }) => formatDistance(row.original.distanceKm),
    },
    { accessorKey: 'tripCount', header: t('colTrips') },
  ];

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />
      <DateRangeControl value={range} today={today} onChange={setRange} />

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={RouteIcon}
          label={t('kpiActive')}
          value={formatNumber(rows.length)}
          unit="rute"
          loading={routes.isLoading}
        />
        <MetricCard
          icon={MapPin}
          label={t('kpiTrips')}
          value={formatNumber(totalTrips)}
          unit="trayek"
          loading={routes.isLoading}
        />
      </div>

      <div className="mt-4">
        <ChartCard title={t('tableTitle')}>
          <DataTable
            columns={columns}
            data={rows}
            loading={routes.isLoading}
            error={routes.isError}
            emptyTitle={tCommon('empty')}
          />
        </ChartCard>
      </div>
    </>
  );
}
