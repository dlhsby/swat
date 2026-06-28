'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { MapPin, Route as RouteIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ChartCard } from '@/components/monitoring/chart-card';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { ExportMenu } from '@/components/monitoring/export-menu';
import { HaulingMap } from '@/components/monitoring/hauling-map';
import { PageHead } from '@/components/shell/page-head';
import { AlertCenter } from '@/components/tracking/alert-center';
import {
  DataTable,
  MetricCard,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useRouteMap, useRoutesActive, useTripSummary } from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { usePermissions } from '@/hooks/use-permissions';
import { useFleetPositions } from '@/hooks/use-tracking';
import { formatDateDisplay, formatDistance, formatNumber, formatTime } from '@/lib/format';
import { type RouteActivityRow, type TripSummaryRow } from '@/lib/monitoring-api';

export default function HaulingPage(): JSX.Element {
  const t = useTranslations('monitoring.hauling');
  const tCommon = useTranslations('monitoring.common');
  const { range, setRange, today } = useMonitoringRange();
  const { can } = usePermissions();
  const canTrack = can('tracking:read');
  const canAlerts = can('deviation-alert:read');

  const routes = useRoutesActive(range);
  const map = useRouteMap(range);
  const trips = useTripSummary(range);
  // Live vehicle layer (Phase 7) — gated by tracking:read; the map + sites/routes
  // still render for users without it (graceful degradation).
  const fleet = useFleetPositions(canTrack);

  const routeRows = routes.data ?? [];
  const tripRows = trips.data?.data ?? [];
  const totalTrips = routeRows.reduce((sum, row) => sum + row.tripCount, 0);

  const opColumns: ColumnDef<TripSummaryRow>[] = [
    {
      accessorKey: 'operationDate',
      header: t('colDate'),
      cell: ({ row }) => formatDateDisplay(row.original.operationDate),
    },
    {
      accessorKey: 'plateNumber',
      header: t('colVehicle'),
      cell: ({ row }) => <span className="font-mono">{row.original.plateNumber}</span>,
    },
    { accessorKey: 'driverName', header: t('colDriver') },
    {
      accessorKey: 'routeName',
      header: t('colRoute'),
      cell: ({ row }) => row.original.routeName ?? '—',
    },
    {
      accessorKey: 'targetOdometer',
      header: t('colKmTarget'),
      cell: ({ row }) => formatNumber(row.original.targetOdometer),
    },
    {
      accessorKey: 'actualOdometer',
      header: t('colKmActual'),
      cell: ({ row }) => formatNumber(row.original.actualOdometer),
    },
    {
      accessorKey: 'targetTime',
      header: t('colTimeTarget'),
      cell: ({ row }) => (row.original.targetTime ? formatTime(row.original.targetTime) : '—'),
    },
    {
      accessorKey: 'actualTime',
      header: t('colTimeActual'),
      cell: ({ row }) => (row.original.actualTime ? formatTime(row.original.actualTime) : '—'),
    },
    {
      accessorKey: 'status',
      header: t('colStatus'),
      cell: ({ row }) => <StatusPill domain="trip" value={row.original.status} />,
    },
  ];

  const recapColumns: ColumnDef<RouteActivityRow>[] = [
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeControl value={range} today={today} onChange={setRange} />
        <ExportMenu type="route" range={range} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={RouteIcon}
          label={t('kpiActive')}
          value={formatNumber(routeRows.length)}
          unit="rute"
          loading={routes.isLoading}
        />
        <MetricCard
          icon={MapPin}
          label={t('kpiTrips')}
          value={formatNumber(totalTrips)}
          unit="perjalanan"
          loading={routes.isLoading}
        />
      </div>

      <Tabs defaultValue="map" className="mt-4">
        <TabsList>
          <TabsTrigger value="map">{t('tabMap')}</TabsTrigger>
          <TabsTrigger value="operational">{t('tabOperational')}</TabsTrigger>
          <TabsTrigger value="recap">{t('tabRecap')}</TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <ChartCard title={t('mapTitle')}>
              <HaulingMap
                sites={map.data?.sites ?? []}
                edges={map.data?.edges ?? []}
                loading={map.isLoading}
                vehicles={canTrack ? fleet.positions : []}
              />
            </ChartCard>
            {canAlerts ? <AlertCenter enabled={canAlerts} /> : null}
          </div>
        </TabsContent>

        <TabsContent value="operational">
          <ChartCard title={t('opTitle')}>
            <DataTable
              columns={opColumns}
              data={tripRows}
              loading={trips.isLoading}
              error={trips.isError}
              emptyTitle={tCommon('empty')}
              searchPlaceholder="Cari kendaraan / pengemudi…"
            />
          </ChartCard>
        </TabsContent>

        <TabsContent value="recap">
          <ChartCard
            title={t('recapTitle')}
            footer={<p className="text-caption text-neutral-400">{tCommon('monthNote')}</p>}
          >
            <DataTable
              columns={recapColumns}
              data={routeRows}
              loading={routes.isLoading}
              error={routes.isError}
              emptyTitle={tCommon('empty')}
            />
          </ChartCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
