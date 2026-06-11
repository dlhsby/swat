'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Droplets, Fuel, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { hiddenIdColumn } from '@/components/crud/crud-list-shell';
import { PageHead } from '@/components/shell/page-head';
import { Badge, Card, CardContent, DataTable } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { formatDateDisplay, formatFuel, formatNumber, formatRupiah } from '@/lib/format';
import { type RefuelDto, listRefuels } from '@/lib/operations-api';

function Metric({
  icon: Icon,
  label,
  value,
  tone = 'bg-primary-50 text-primary-700',
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
  tone?: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-base ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-h2 font-bold tabular-nums text-neutral-900">{value}</p>
        <p className="text-label text-neutral-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function RefuelLogPage(): JSX.Element {
  const t = useTranslations('nav');
  const { rows, loading, error, reload } = useResourceList(listRefuels);

  const kpi = useMemo(() => {
    const liters = rows.reduce((sum, r) => sum + (r.approvedLiters ?? 0), 0);
    const cost = rows.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0);
    const anomalies = rows.filter((r) => r.anomaly).length;
    return { count: rows.length, liters, cost, anomalies };
  }, [rows]);

  const columns = useMemo<ColumnDef<RefuelDto, unknown>[]>(
    () => [
      hiddenIdColumn<RefuelDto>(),
      {
        accessorKey: 'operationDate',
        header: 'Tanggal',
        meta: { label: 'Tanggal' },
        cell: ({ row }) => formatDateDisplay(row.original.operationDate),
      },
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => <span className="font-mono">{row.original.vehiclePlate}</span>,
      },
      {
        accessorKey: 'fuelName',
        header: 'BBM',
        meta: { label: 'BBM' },
        cell: ({ row }) => row.original.fuelName ?? '—',
      },
      {
        accessorKey: 'requestedLiters',
        header: 'Diminta',
        meta: { label: 'Diminta' },
        cell: ({ row }) =>
          row.original.requestedLiters !== null ? formatFuel(row.original.requestedLiters) : '—',
      },
      {
        accessorKey: 'approvedLiters',
        header: 'Disetujui',
        meta: { label: 'Disetujui' },
        cell: ({ row }) =>
          row.original.approvedLiters !== null ? formatFuel(row.original.approvedLiters) : '—',
      },
      {
        accessorKey: 'estimatedCost',
        header: 'Estimasi Biaya',
        meta: { label: 'Estimasi Biaya' },
        cell: ({ row }) =>
          row.original.estimatedCost !== null ? formatRupiah(row.original.estimatedCost) : '—',
      },
      {
        id: 'anomaly',
        header: 'Catatan',
        enableSorting: false,
        meta: { label: 'Catatan' },
        cell: ({ row }) =>
          row.original.anomaly ? (
            <Badge variant="amber" dot>
              Disetujui &lt; diminta
            </Badge>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHead title={t('refuelLog')} description="Riwayat pengisian BBM dengan estimasi biaya." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={Fuel} label="Total Pengisian" value={formatNumber(kpi.count)} />
        <Metric icon={Droplets} label="Liter Disetujui" value={formatFuel(kpi.liters)} />
        <Metric icon={Receipt} label="Estimasi Biaya" value={formatRupiah(kpi.cost)} />
        <Metric
          icon={AlertTriangle}
          label="Anomali"
          value={formatNumber(kpi.anomalies)}
          tone="bg-warning-50 text-warning-700"
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari kendaraan / BBM…"
      />
    </>
  );
}
