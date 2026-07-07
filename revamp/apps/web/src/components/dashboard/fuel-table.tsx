'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import { ChartCard } from '@/components/monitoring/chart-card';
import { DataTable } from '@/components/ui';
import { useFuelDetail } from '@/hooks/use-monitoring';
import { formatFuel, formatNumber, formatTime } from '@/lib/format';
import { type FuelDetailRow } from '@/lib/monitoring-api';

/** Per-refuel-event BBM table for the picked day: plate, fuel type, requested vs
 * approved litres, odometer at fill, and fill time. */
export function FuelTable({ date }: { date: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const query = useFuelDetail({ dateFrom: date, dateTo: date });

  const liters = (value: number | null): string => (value === null ? '—' : formatFuel(value));

  const columns: ColumnDef<FuelDetailRow>[] = [
    {
      accessorKey: 'plateNumber',
      header: t('colPlate'),
      cell: ({ row }) => <span className="font-mono">{row.original.plateNumber}</span>,
    },
    {
      accessorKey: 'fuelName',
      header: t('colFuelType'),
      cell: ({ row }) => row.original.fuelName ?? '—',
    },
    {
      accessorKey: 'requestedLiters',
      header: t('colRequested'),
      cell: ({ row }) => (
        <span className="tabular-nums">{liters(row.original.requestedLiters)}</span>
      ),
    },
    {
      accessorKey: 'approvedLiters',
      header: t('colApproved'),
      cell: ({ row }) => (
        <span className="tabular-nums">{liters(row.original.approvedLiters)}</span>
      ),
    },
    {
      accessorKey: 'odometer',
      header: t('colOdometer'),
      cell: ({ row }) => (
        <span className="tabular-nums">{formatNumber(row.original.odometer)} km</span>
      ),
    },
    {
      accessorKey: 'filledAt',
      header: t('colFilledAt'),
      cell: ({ row }) => (row.original.filledAt ? formatTime(row.original.filledAt) : '—'),
    },
  ];

  return (
    <ChartCard title={t('tableFuelTitle')} subtitle={t('tableFuelSub')}>
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isLoading}
        error={query.isError}
        emptyTitle={t('emptyTable')}
        searchPlaceholder={t('searchPlate')}
      />
    </ChartCard>
  );
}
