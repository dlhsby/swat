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
        breadcrumb={[{ label: 'Hari Transaksi', href: '/transaction-days' }, { label: day.date }]}
        title={`Haul · ${formatDateDisplay(day.date)}`}
        description={`${verifiedCount}/${allTrips.length} trayek terverifikasi`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill domain="day" value={day.status} />
            {day.status !== 'DONE' ? (
              <ProtectedAction permission="transaction-day:manage">
                <Button
                  onClick={() => setMarkDone(true)}
                  disabled={openHauls}
                  title={openHauls ? 'Semua haul harus selesai terlebih dahulu.' : undefined}
                >
                  Tandai Hari Selesai
                </Button>
              </ProtectedAction>
            ) : null}
          </div>
        }
      />

      <div className="space-y-2.5">
        {/* Column header (hi-fi `.hf-haulhead`) — desktop only. */}
        {rows.length > 0 ? (
          <div className="hidden grid-cols-[1.3fr_1.1fr_1.2fr_1.2fr_0.7fr_auto] items-center gap-4 px-[18px] pb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-neutral-400 lg:grid">
            <span>Kendaraan</span>
            <span>Verifikasi</span>
            <span>Berangkat (T/A)</span>
            <span>Kembali (T/A)</span>
            <span>Ritase</span>
            <span />
          </div>
        ) : null}

        {rows.map((row) => {
          const total = row.trips.length;
          const verified = row.trips.filter((t) => t.status === 'VERIFIED').length;
          return (
            <div
              key={row.id}
              className="grid grid-cols-1 items-center gap-x-4 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-0 px-[18px] py-4 transition-shadow hover:shadow-sm sm:grid-cols-2 lg:grid-cols-[1.3fr_1.1fr_1.2fr_1.2fr_0.7fr_auto]"
            >
              {/* Vehicle + driver (hi-fi `.plate` / `.drv`). */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="font-mono text-[14px] font-semibold text-neutral-900">
                  {row.vehiclePlate}
                </div>
                <div className="mt-0.5 text-[12px] text-neutral-500">{row.driverName}</div>
              </div>

              {/* Verification badge. */}
              <div>
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

              {/* Time/target columns (hi-fi `.hf-tt`). */}
              <div className="text-[12px] text-neutral-500">
                <span className="lg:hidden">Berangkat T/A</span>
                <span className="hidden lg:inline">Berangkat</span>
                <b className="mt-0.5 block text-[14px] font-semibold tabular-nums text-neutral-900">
                  {leg(row.departTargetTime, row.departActualTime)}
                </b>
              </div>
              <div className="text-[12px] text-neutral-500">
                <span className="lg:hidden">Kembali T/A</span>
                <span className="hidden lg:inline">Kembali</span>
                <b className="mt-0.5 block text-[14px] font-semibold tabular-nums text-neutral-900">
                  {leg(row.returnTargetTime, row.returnActualTime)}
                </b>
              </div>
              <div className="text-[12px] text-neutral-500">
                Ritase
                <b className="mt-0.5 block text-[14px] font-semibold tabular-nums text-neutral-900">
                  {formatNumber(total)}
                </b>
              </div>

              {/* Actions. */}
              <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
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
            </div>
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
