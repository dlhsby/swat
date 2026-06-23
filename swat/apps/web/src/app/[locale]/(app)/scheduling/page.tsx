'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import { Alert, Button, DataTable, StatusPill, notify } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { todayWIB } from '@/lib/dates';
import { formatDateDisplay, formatNumber, formatTonnage } from '@/lib/format';
import { initializeToday, listTransactionDays } from '@/lib/transactions-api';
import { type TransactionDaySummaryDto } from '@/lib/types/transactions';

export default function TransactionDaysPage(): JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const [days, setDays] = useState<TransactionDaySummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setDays(await listTransactionDays());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Initialization only targets today; hide the action once today's day exists.
  const todayInitialized = useMemo(() => days.some((d) => d.date === todayWIB()), [days]);

  const onInitialize = async (): Promise<void> => {
    setInitializing(true);
    try {
      const result = await initializeToday();
      notify.success(
        result.created
          ? `Hari transaksi dibuat: ${result.hauls} haul, ${result.trips} rute.`
          : 'Hari transaksi hari ini sudah ada.',
      );
      await load();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal membuat jadwal hari ini.');
    } finally {
      setInitializing(false);
    }
  };

  const columns = useMemo<ColumnDef<TransactionDaySummaryDto, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Tanggal',
        meta: { label: 'Tanggal' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm text-neutral-900">
            {formatDateDisplay(row.original.date)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusPill domain="day" value={row.original.status} />,
      },
      {
        accessorKey: 'vehicleCount',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan', filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.vehicleCount)}</span>
        ),
      },
      {
        accessorKey: 'tonnageKg',
        header: 'Tonase',
        meta: { label: 'Tonase', filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatTonnage(row.original.tonnageKg / 1000)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/scheduling/${row.original.id}`)}
            >
              Lihat Board
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <>
      <PageHead
        title={t('scheduling')}
        actions={
          !todayInitialized ? (
            <ProtectedAction permission="transaction-day:manage">
              <Button onClick={() => void onInitialize()} loading={initializing}>
                Buat Jadwal Hari Ini
              </Button>
            </ProtectedAction>
          ) : null
        }
      />

      <Alert variant="info" className="mb-4">
        Buat Jadwal Hari Ini menyusun jadwal harian dan menurunkan Haul + penugasan dari jadwal kru
        aktif. Operasi ini idempoten dan hanya untuk hari ini — backdate atau tanggal di masa depan
        tidak didukung. Tombol disembunyikan setelah hari ini diinisiasi.
      </Alert>

      <DataTable
        columns={columns}
        data={days}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        onRefresh={() => void load()}
        refreshing={loading}
        getRowId={(d) => d.date}
        searchPlaceholder="Cari tanggal"
        emptyTitle="Belum ada hari transaksi."
      />
    </>
  );
}
