'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Fuel, Gauge, MapPin, Timer, Wifi } from 'lucide-react';

import { ChartCard } from '@/components/monitoring/chart-card';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { PageHead } from '@/components/shell/page-head';
import { Badge, DataTable, MetricCard } from '@/components/ui';
import { useEfficiency } from '@/hooks/use-efficiency';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { formatNumber } from '@/lib/format';
import { type EfficiencyRow } from '@/lib/tracking-api';

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const km = (meters: number): string => formatNumber(Math.round(meters / 1000));

export default function EfficiencyPage(): JSX.Element {
  const { range, setRange, today } = useMonitoringRange();
  const { data, isLoading, isError } = useEfficiency(range);
  const kpis = data?.kpis;

  const columns: ColumnDef<EfficiencyRow>[] = [
    { accessorKey: 'date', header: 'Tanggal' },
    {
      accessorKey: 'plate',
      header: 'Kendaraan',
      cell: ({ row }) => <span className="font-mono">{row.original.plate}</span>,
    },
    {
      accessorKey: 'positionSource',
      header: 'Sumber',
      cell: ({ row }) => (
        <Badge appearance="count">
          {row.original.positionSource === 'gps' ? 'GPS' : 'Tercatat'}
        </Badge>
      ),
    },
    {
      accessorKey: 'plannedMeters',
      header: 'Rencana (km)',
      cell: ({ row }) => km(row.original.plannedMeters),
    },
    {
      accessorKey: 'actualMeters',
      header: 'Aktual (km)',
      cell: ({ row }) => km(row.original.actualMeters),
    },
    {
      accessorKey: 'adherencePct',
      header: 'Kepatuhan',
      cell: ({ row }) =>
        row.original.adherencePct == null ? '—' : `${formatNumber(row.original.adherencePct)}%`,
    },
    { accessorKey: 'lateMinutes', header: 'Telat (mnt)' },
    {
      accessorKey: 'wastedFuelLiters',
      header: 'BBM boros (L)',
      cell: ({ row }) => formatNumber(row.original.wastedFuelLiters),
    },
    { accessorKey: 'deviationCount', header: 'Deviasi' },
  ];

  return (
    <>
      <PageHead
        title="Efisiensi & Pemborosan"
        description="Kepatuhan rute, waktu & BBM terbuang, dan cakupan GPS armada."
      />
      <DateRangeControl value={range} today={today} onChange={setRange} />

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={Gauge}
          label="Kepatuhan rute"
          value={kpis?.adherencePct == null ? '—' : `${formatNumber(kpis.adherencePct)}%`}
          unit=""
          loading={isLoading}
        />
        <MetricCard
          icon={Fuel}
          label="BBM terbuang"
          value={formatNumber(kpis?.wastedFuelLiters ?? 0)}
          unit="L"
          loading={isLoading}
        />
        <MetricCard
          icon={Timer}
          label="Waktu telat"
          value={formatNumber(kpis?.lateMinutes ?? 0)}
          unit="mnt"
          loading={isLoading}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Total deviasi"
          value={formatNumber(kpis?.deviationCount ?? 0)}
          unit=""
          loading={isLoading}
        />
        <MetricCard
          icon={MapPin}
          label="Cakupan GPS"
          value={kpis ? pct(kpis.gpsCoverageRate) : '—'}
          unit=""
          loading={isLoading}
        />
        <MetricCard
          icon={Wifi}
          label="Perangkat offline"
          value={kpis ? `${kpis.deviceOffline} (${pct(kpis.deviceOfflineRate)})` : '—'}
          unit=""
          loading={isLoading}
        />
      </div>

      <div className="mt-4">
        <ChartCard title="Efisiensi per kendaraan / hari">
          <DataTable
            columns={columns}
            data={data?.rows ?? []}
            loading={isLoading}
            error={isError}
            emptyTitle="Belum ada data efisiensi untuk rentang ini."
            searchPlaceholder="Cari kendaraan…"
          />
        </ChartCard>
      </div>
    </>
  );
}
