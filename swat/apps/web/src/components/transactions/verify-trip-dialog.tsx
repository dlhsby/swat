'use client';

import { type ReactNode, useState } from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { formatFuel, formatNumber, formatTime, formatWeight } from '@/lib/format';
import { verifyTrip } from '@/lib/transactions-api';
import { type TripDto } from '@/lib/types/transactions';

export interface VerifyTripDialogProps {
  trip: TripDto | null;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-body-sm text-neutral-500">{label}</dt>
      <dd className="text-right text-body-sm font-medium text-neutral-900">{children}</dd>
    </div>
  );
}

/** Review a recorded trip's actuals and mark it verified. */
export function VerifyTripDialog({
  trip,
  onOpenChange,
  onVerified,
}: VerifyTripDialogProps): JSX.Element {
  const [saving, setSaving] = useState(false);
  const category = trip?.routeCategory ?? 'DEPART_POOL';

  const onVerify = async (): Promise<void> => {
    if (!trip) {
      return;
    }
    setSaving(true);
    try {
      await verifyTrip(trip.id);
      notify.success('Trip terverifikasi.');
      onOpenChange(false);
      onVerified();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memverifikasi trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={trip !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Verifikasi Trayek</DialogTitle>
          <DialogDescription>{trip?.name}</DialogDescription>
        </DialogHeader>

        {trip ? (
          <dl className="divide-y divide-neutral-100">
            <Row label="Waktu (target → aktual)">
              {trip.targetTime ? formatTime(trip.targetTime) : '—'} →{' '}
              {trip.actualTime ? formatTime(trip.actualTime) : '—'}
            </Row>
            <Row label="Odometer">
              {formatNumber(trip.targetOdometer)} → {formatNumber(trip.actualOdometer)} km
            </Row>
            {category === 'DISPOSAL' ? (
              <>
                <Row label="Tara">{formatWeight(trip.tareWeight)}</Row>
                <Row label="Kotor">
                  {trip.grossWeight != null ? formatWeight(trip.grossWeight) : '—'}
                </Row>
                <Row label="Bersih">
                  <span className="text-success-700">
                    {trip.netWeight != null ? formatWeight(trip.netWeight) : '—'}
                  </span>
                </Row>
              </>
            ) : null}
            {trip.wasteVolume != null ? <Row label="Volume">{trip.wasteVolume} m³</Row> : null}
            {category === 'REFUEL' ? (
              <Row label="BBM (diminta → disetujui)">
                {trip.fuelRequestedLiters != null ? formatFuel(trip.fuelRequestedLiters) : '—'} →{' '}
                {trip.fuelApprovedLiters != null ? formatFuel(trip.fuelApprovedLiters) : '—'}
              </Row>
            ) : null}
            <Row label="Dicatat oleh">{trip.recordedByName ?? '—'}</Row>
          </dl>
        ) : null}

        <Alert variant="info">Pastikan data aktual sudah sesuai sebelum memverifikasi.</Alert>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void onVerify()} loading={saving}>
            Terverifikasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
