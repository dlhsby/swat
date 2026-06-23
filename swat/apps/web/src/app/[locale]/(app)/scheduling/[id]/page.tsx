'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil } from 'lucide-react';
import { use, useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import { AddTripDialog } from '@/components/transactions/add-trip-dialog';
import { ReconcileDialog } from '@/components/transactions/reconcile-dialog';
import { RecordTripDialog } from '@/components/transactions/record-trip-dialog';
import { TripPhotosDialog } from '@/components/transactions/trip-photos-dialog';
import { TripSheet } from '@/components/transactions/trip-sheet';
import { VerifyTripDialog } from '@/components/transactions/verify-trip-dialog';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  DataTable,
  Skeleton,
  StatusPill,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatNumber, formatTime } from '@/lib/format';
import { getTransactionDayById, updateDayStatus } from '@/lib/transactions-api';
import {
  type HaulAssignmentDto,
  type TransactionDayDto,
  type TripDto,
} from '@/lib/types/transactions';

interface AssignmentRow extends HaulAssignmentDto {
  vehiclePlate: string;
  haulStatus: string;
}

function leg(target: string | null, actual: string | null): string {
  return `${target ? formatTime(target) : '—'} / ${actual ? formatTime(actual) : '—'}`;
}

export default function HaulBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id: dayId } = use(params);
  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markDone, setMarkDone] = useState(false);

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [recordTrip, setRecordTrip] = useState<TripDto | null>(null);
  const [verifyTrip, setVerifyTrip] = useState<TripDto | null>(null);
  const [addTripAssignmentId, setAddTripAssignmentId] = useState<string | null>(null);
  const [photoTrip, setPhotoTrip] = useState<TripDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setDay(await getTransactionDayById(dayId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [dayId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<AssignmentRow[]>(
    () =>
      (day?.hauls ?? []).flatMap((haul) =>
        haul.assignments.map((a) => ({
          ...a,
          vehiclePlate: haul.vehiclePlate,
          haulStatus: haul.status,
        })),
      ),
    [day],
  );

  const allTrips = useMemo(() => rows.flatMap((r) => r.trips), [rows]);
  const verifiedCount = allTrips.filter((t) => t.status === 'VERIFIED').length;
  const openHauls = (day?.hauls ?? []).some((h) => h.status !== 'DONE');

  const selectedAssignment = rows.find((r) => r.id === sheetId) ?? null;
  const reconcileAssignment = rows.find((r) => r.id === reconcileId) ?? null;

  const columns = useMemo<ColumnDef<AssignmentRow, unknown>[]>(
    () => [
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-neutral-900">
            {row.original.vehiclePlate}
          </span>
        ),
      },
      {
        accessorKey: 'driverName',
        header: 'Pengemudi',
        meta: { label: 'Pengemudi' },
        cell: ({ row }) => <span className="text-neutral-700">{row.original.driverName}</span>,
      },
      {
        id: 'verifikasi',
        accessorFn: (r) => r.trips.filter((t) => t.status === 'VERIFIED').length,
        header: 'Verifikasi',
        meta: { label: 'Verifikasi' },
        cell: ({ row }) => {
          const total = row.original.trips.length;
          const verified = row.original.trips.filter((t) => t.status === 'VERIFIED').length;
          const variant =
            verified === total && total > 0 ? 'green' : verified > 0 ? 'amber' : 'slate';
          return (
            <Badge variant={variant} dot>
              {verified}/{total} Terverifikasi
            </Badge>
          );
        },
      },
      {
        id: 'berangkat',
        accessorFn: (r) => r.departActualTime ?? r.departTargetTime ?? '',
        header: 'Berangkat (T/A)',
        meta: { label: 'Berangkat (T/A)' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {leg(row.original.departTargetTime, row.original.departActualTime)}
          </span>
        ),
      },
      {
        id: 'kembali',
        accessorFn: (r) => r.returnActualTime ?? r.returnTargetTime ?? '',
        header: 'Kembali (T/A)',
        meta: { label: 'Kembali (T/A)' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {leg(row.original.returnTargetTime, row.original.returnActualTime)}
          </span>
        ),
      },
      {
        id: 'ritase',
        accessorFn: (r) => r.trips.length,
        header: 'Ritase',
        meta: { label: 'Ritase', filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.trips.length)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        meta: { pinRight: true, label: 'Aksi' },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <ProtectedAction permission="trip:update">
              <Button variant="outline" size="sm" onClick={() => setReconcileId(row.original.id)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </Button>
            </ProtectedAction>
            <Button variant="secondary" size="sm" onClick={() => setSheetId(row.original.id)}>
              <Eye className="h-4 w-4" aria-hidden />
              Lihat
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const onMarkDone = async (): Promise<void> => {
    try {
      await updateDayStatus(dayId, 'DONE');
      notify.success('Hari transaksi ditandai selesai.');
      setMarkDone(false);
      await load();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menandai hari selesai.');
    }
  };

  if (loading) {
    return <Skeleton className="h-64" />;
  }
  if (error || !day) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-body-sm text-neutral-500">Gagal memuat hari transaksi.</p>
          <Button variant="secondary" onClick={() => void load()}>
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHead
        breadcrumb={[{ label: 'Penjadwalan', href: '/scheduling' }, { label: day.date }]}
        title={`Angkut Sampah · ${formatDateDisplay(day.date)}`}
        description={`${verifiedCount}/${allTrips.length} rute terverifikasi`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill domain="day" value={day.status} />
            {day.status !== 'DONE' ? (
              <ProtectedAction permission="transaction-day:manage">
                <Button
                  onClick={() => setMarkDone(true)}
                  disabled={openHauls}
                  title={
                    openHauls
                      ? 'Semua angkut sampah harus berstatus selesai terlebih dahulu. Verifikasi rute tidak diwajibkan.'
                      : 'Tandai seluruh hari transaksi selesai.'
                  }
                >
                  Tandai Hari Selesai
                </Button>
              </ProtectedAction>
            ) : null}
          </div>
        }
      />

      {day.status !== 'DONE' ? (
        <p className="-mt-2 text-tiny text-neutral-500">
          {openHauls
            ? 'Hari dapat ditandai selesai setelah semua angkut sampah berstatus selesai (verifikasi rute opsional, tidak menghalangi). Hanya peran Administrasi/Administrator yang dapat menandainya.'
            : 'Semua angkut sampah selesai — hari siap ditandai selesai oleh Administrasi/Administrator.'}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.vehiclePlate}
        searchPlaceholder="Cari kendaraan / pengemudi"
        onRefresh={() => void load()}
        refreshing={loading}
        emptyTitle="Tidak ada angkut sampah untuk hari ini."
      />

      <TripSheet
        assignment={selectedAssignment}
        vehiclePlate={selectedAssignment?.vehiclePlate}
        onOpenChange={(open) => !open && setSheetId(null)}
        onRecord={(trip) => setRecordTrip(trip)}
        onVerify={(trip) => setVerifyTrip(trip)}
        onAddTrip={(assignmentId) => setAddTripAssignmentId(assignmentId)}
        onPhotos={(trip) => setPhotoTrip(trip)}
      />
      <AddTripDialog
        haulAssignmentId={addTripAssignmentId}
        onOpenChange={(open) => !open && setAddTripAssignmentId(null)}
        onCreated={() => void load()}
      />
      <TripPhotosDialog trip={photoTrip} onOpenChange={(open) => !open && setPhotoTrip(null)} />
      <ReconcileDialog
        assignment={reconcileAssignment}
        onOpenChange={(open) => !open && setReconcileId(null)}
        onChanged={() => void load()}
      />
      <RecordTripDialog
        trip={recordTrip}
        onOpenChange={(open) => !open && setRecordTrip(null)}
        onRecorded={() => void load()}
      />
      <VerifyTripDialog
        trip={verifyTrip}
        onOpenChange={(open) => !open && setVerifyTrip(null)}
        onVerified={() => void load()}
      />

      <ConfirmDialog
        open={markDone}
        onOpenChange={setMarkDone}
        title="Tandai hari transaksi selesai?"
        description="Pastikan semua angkut sampah telah selesai dan diverifikasi."
        confirmLabel="Tandai Selesai"
        onConfirm={() => void onMarkDone()}
      />
    </>
  );
}
