'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { PageHead } from '@/components/shell/page-head';
import {
  Badge,
  Button,
  Combobox,
  type ComboboxOption,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { useResourceList } from '@/hooks/use-resource-list';
import { useAcknowledgeAlert, useAlertHistory } from '@/hooks/use-tracking';
import { formatDateDisplay, formatTime } from '@/lib/format';
import { type VehicleDto, vehiclesApi } from '@/lib/master-api';
import { type DeviationAlert } from '@/lib/tracking-api';

const TYPE_LABEL: Record<string, string> = {
  off_corridor: 'Keluar koridor',
  off_sequence: 'Urutan menyimpang',
  dwell_too_long: 'Berhenti terlalu lama',
  late_to_schedule: 'Terlambat dari jadwal',
};

function severityVariant(severity: string): 'red' | 'amber' | 'blue' {
  if (severity === 'CRITICAL') return 'red';
  if (severity === 'WARNING') return 'amber';
  return 'blue';
}

const PAGE_SIZE = 20;

/**
 * Filterable history of ALL deviation alerts (open, resolved, acknowledged or
 * not) — the live "Pusat Peringatan" on Pengangkutan → Peta only ever shows the
 * open ones. Reached from the topbar alert bell.
 */
export default function AlertHistoryPage(): JSX.Element {
  const { range, setRange, today } = useMonitoringRange();
  const [vehicleId, setVehicleId] = useState('');
  const [resolved, setResolved] = useState<'ALL' | 'false' | 'true'>('ALL');
  const [acknowledged, setAcknowledged] = useState<'ALL' | 'false' | 'true'>('ALL');
  const [alertType, setAlertType] = useState('ALL');
  const [page, setPage] = useState(1);

  const { rows: vehicles } = useResourceList(vehiclesApi.list);
  const vehicleOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: '', label: 'Semua kendaraan' },
      ...vehicles.map((v: VehicleDto) => ({
        value: v.id,
        label: `${v.plateNumber} · ${v.modelBrand}`,
      })),
    ],
    [vehicles],
  );

  const filter = useMemo(
    () => ({
      vehicleId: vehicleId || undefined,
      resolved: resolved === 'ALL' ? undefined : resolved === 'true',
      acknowledged: acknowledged === 'ALL' ? undefined : acknowledged === 'true',
      from: `${range.dateFrom}T00:00:00.000Z`,
      to: `${range.dateTo}T23:59:59.999Z`,
      page,
      limit: PAGE_SIZE,
    }),
    [vehicleId, resolved, acknowledged, range, page],
  );
  const { data, isLoading, refetch, isFetching } = useAlertHistory(filter);
  const ack = useAcknowledgeAlert();

  // Alert type has no server-side filter (backend doesn't index on it) — narrow
  // the current page client-side. Doesn't affect the server total/pagination.
  const rows = useMemo(
    () =>
      alertType === 'ALL'
        ? (data?.data ?? [])
        : (data?.data ?? []).filter((a) => a.alertType === alertType),
    [data, alertType],
  );

  const columns = useMemo<ColumnDef<DeviationAlert, unknown>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Waktu',
        meta: { label: 'Waktu' },
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-body-sm tabular-nums">
            {formatDateDisplay(row.original.createdAt)} {formatTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.vehiclePlate}</span>
        ),
      },
      {
        accessorKey: 'alertType',
        header: 'Jenis',
        meta: { label: 'Jenis' },
        cell: ({ row }) => TYPE_LABEL[row.original.alertType] ?? row.original.alertType,
      },
      {
        accessorKey: 'severity',
        header: 'Keparahan',
        meta: { label: 'Keparahan' },
        cell: ({ row }) => (
          <Badge variant={severityVariant(row.original.severity)}>{row.original.severity}</Badge>
        ),
      },
      {
        accessorKey: 'distanceM',
        header: 'Jarak',
        meta: { label: 'Jarak' },
        cell: ({ row }) => (row.original.distanceM != null ? `${row.original.distanceM} m` : '—'),
      },
      {
        accessorKey: 'pingCount',
        header: 'Jumlah',
        meta: { label: 'Jumlah' },
        cell: ({ row }) => `${row.original.pingCount}×`,
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.resolvedAt ? (
              <Badge appearance="count">Terselesaikan</Badge>
            ) : (
              <Badge variant="amber">Terbuka</Badge>
            )}
            {row.original.isAcknowledged ? <Badge appearance="count">Diakui</Badge> : null}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { label: 'Aksi' },
        cell: ({ row }) =>
          row.original.isAcknowledged ? null : (
            <Button
              size="sm"
              variant="secondary"
              loading={ack.isPending && ack.variables?.id === row.original.id}
              onClick={() => ack.mutate({ id: row.original.id })}
            >
              Tandai
            </Button>
          ),
      },
    ],
    [ack],
  );

  return (
    <>
      <PageHead
        title="Riwayat Peringatan"
        description="Seluruh peringatan penyimpangan rute — terbuka, terselesaikan, dan yang sudah diakui."
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeControl value={range} today={today} onChange={setRange} />
            <Combobox
              options={vehicleOptions}
              value={vehicleId}
              onValueChange={(v) => {
                setVehicleId(v);
                setPage(1);
              }}
              placeholder="Semua kendaraan"
              searchPlaceholder="Cari kendaraan…"
              className="w-48"
            />
            <Select value={alertType} onValueChange={(v) => setAlertType(v)}>
              <SelectTrigger className="h-9 w-44" aria-label="Filter jenis peringatan">
                <SelectValue placeholder="Semua jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua jenis</SelectItem>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={resolved}
              onValueChange={(v) => {
                setResolved(v as typeof resolved);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-40" aria-label="Filter status">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua status</SelectItem>
                <SelectItem value="false">Terbuka</SelectItem>
                <SelectItem value="true">Terselesaikan</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={acknowledged}
              onValueChange={(v) => {
                setAcknowledged(v as typeof acknowledged);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-40" aria-label="Filter pengakuan">
                <SelectValue placeholder="Semua pengakuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua pengakuan</SelectItem>
                <SelectItem value="false">Belum diakui</SelectItem>
                <SelectItem value="true">Sudah diakui</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        serverPagination={{
          page: page - 1,
          pageSize: PAGE_SIZE,
          total: data?.meta.total ?? 0,
          onPageChange: (p) => setPage(p + 1),
          onPageSizeChange: () => undefined,
          onSearchChange: () => undefined,
        }}
      />
    </>
  );
}
