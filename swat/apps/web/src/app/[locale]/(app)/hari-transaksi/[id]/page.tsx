'use client';

import { CheckCircle2, Eye, Pencil } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import { ReconcileDialog } from '@/components/transactions/reconcile-dialog';
import { RecordTripDialog } from '@/components/transactions/record-trip-dialog';
import { TripSheet } from '@/components/transactions/trip-sheet';
import { VerifyTripDialog } from '@/components/transactions/verify-trip-dialog';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
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

export default function HaulBoardPage({ params }: { params: { id: string } }): JSX.Element {
  const dayId = Number(params.id);
  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markDone, setMarkDone] = useState(false);

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [recordTrip, setRecordTrip] = useState<TripDto | null>(null);
  const [verifyTrip, setVerifyTrip] = useState<TripDto | null>(null);

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
        breadcrumb={[{ label: 'Hari Transaksi', href: '/hari-transaksi' }, { label: day.date }]}
        title={`Haul · ${formatDateDisplay(day.date)}`}
        description={`${verifiedCount}/${allTrips.length} trayek terverifikasi`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill domain="day" value={day.status} />
            {day.status !== 'DONE' ? (
              <ProtectedAction permission="transaction-day:manage">
                <Button onClick={() => setMarkDone(true)} disabled={openHauls}>
                  Tandai Hari Selesai
                </Button>
              </ProtectedAction>
            ) : null}
          </div>
        }
      />

      <div className="space-y-3">
        {rows.map((row) => {
          const total = row.trips.length;
          const verified = row.trips.filter((t) => t.status === 'VERIFIED').length;
          return (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-body font-semibold text-neutral-900">
                    {row.vehiclePlate}
                  </span>
                  <span className="text-body-sm text-neutral-500">{row.driverName}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-body-sm">
                  <span className="text-neutral-500">
                    Berangkat T/A:{' '}
                    <span className="tabular-nums text-neutral-900">
                      {leg(row.departTargetTime, row.departActualTime)}
                    </span>
                  </span>
                  <span className="text-neutral-500">
                    Kembali T/A:{' '}
                    <span className="tabular-nums text-neutral-900">
                      {leg(row.returnTargetTime, row.returnActualTime)}
                    </span>
                  </span>
                  <span className="text-neutral-500">
                    Ritase:{' '}
                    <span className="tabular-nums text-neutral-900">{formatNumber(total)}</span>
                  </span>
                  {verified === total && total > 0 ? (
                    <Badge variant="green" dot>
                      {verified}/{total} Terverifikasi
                    </Badge>
                  ) : (
                    <Badge variant={verified > 0 ? 'amber' : 'slate'} dot>
                      {verified}/{total} Terverifikasi
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ProtectedAction permission="trip:update">
                    <Button variant="outline" size="sm" onClick={() => setReconcileId(row.id)}>
                      <Pencil className="h-4 w-4" aria-hidden />
                      Edit
                    </Button>
                  </ProtectedAction>
                  <Button variant="secondary" size="sm" onClick={() => setSheetId(row.id)}>
                    <Eye className="h-4 w-4" aria-hidden />
                    Lihat
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-body-sm text-neutral-500">
              <CheckCircle2 className="h-5 w-5 text-neutral-400" aria-hidden />
              Tidak ada haul untuk hari ini.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <TripSheet
        assignment={selectedAssignment}
        vehiclePlate={selectedAssignment?.vehiclePlate}
        onOpenChange={(open) => !open && setSheetId(null)}
        onRecord={(trip) => setRecordTrip(trip)}
        onVerify={(trip) => setVerifyTrip(trip)}
      />
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
        description="Pastikan semua haul telah selesai dan diverifikasi."
        confirmLabel="Tandai Selesai"
        onConfirm={() => void onMarkDone()}
      />
    </>
  );
}
