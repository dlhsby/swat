'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NumberInput,
  Textarea,
  TimePicker,
  notify,
} from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/lib/api-error';
import { combineDateTimeWIB, nowTimeWIB, timeOfWIB } from '@/lib/dates';
import { formatWeight } from '@/lib/format';
import { type RecordTripInput, recordTrip } from '@/lib/transactions-api';
import { type TripDto } from '@/lib/types/transactions';

export interface RecordTripDialogProps {
  trip: TripDto | null;
  onOpenChange: (open: boolean) => void;
  onRecorded: () => void;
}

const TITLES: Record<string, string> = {
  PICKUP: 'Catat Pengambilan',
  DISPOSAL: 'Catat Pembuangan',
  REFUEL: 'Catat Pengisian BBM',
  DEPART_POOL: 'Catat Keberangkatan',
  RETURN_POOL: 'Catat Kepulangan',
};

/** Record a trip's realization. Field set depends on the route category. */
export function RecordTripDialog({
  trip,
  onOpenChange,
  onRecorded,
}: RecordTripDialogProps): JSX.Element {
  const { can } = usePermissions();
  const canApprove = can('fuel:approve');

  const [time, setTime] = useState('');
  const [odometer, setOdometer] = useState<number | ''>('');
  const [tare, setTare] = useState<number | ''>('');
  const [gross, setGross] = useState<number | ''>('');
  const [volume, setVolume] = useState<number | ''>('');
  const [requested, setRequested] = useState<number | ''>('');
  const [approved, setApproved] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const category = trip?.routeCategory ?? 'DEPART_POOL';

  useEffect(() => {
    if (!trip) {
      return;
    }
    setTime(timeOfWIB(trip.actualTime) || nowTimeWIB());
    setOdometer(trip.actualOdometer || '');
    setTare(trip.tareWeight || '');
    setGross(trip.grossWeight ?? '');
    setVolume(trip.wasteVolume ?? '');
    setRequested(trip.fuelRequestedLiters ?? '');
    setApproved(trip.fuelApprovedLiters ?? '');
    setNotes('');
  }, [trip]);

  const net = gross !== '' && tare !== '' ? Number(gross) - Number(tare) : null;
  const grossInvalid = category === 'DISPOSAL' && (gross === '' || (net !== null && net < 0));
  // A non-approver can't set "disetujui" (field disabled, omitted from the
  // payload → server defaults it to "diminta"), so the only client block is a
  // missing requested amount. Over-approval is allowed for fuel:approve holders.
  const refuelInvalid = category === 'REFUEL' && requested === '';

  const canSubmit =
    trip !== null && time !== '' && odometer !== '' && !grossInvalid && !refuelInvalid;

  const onSubmit = async (): Promise<void> => {
    if (!trip || !canSubmit) {
      return;
    }
    setSaving(true);
    const payload: RecordTripInput = {
      actualTime: combineDateTimeWIB(trip.operationDate, time),
      actualOdometer: Number(odometer),
      ...(notes ? { notes } : {}),
    };
    if (category === 'PICKUP') {
      if (tare !== '') payload.tareWeight = Number(tare);
      if (volume !== '') payload.wasteVolume = Number(volume);
    } else if (category === 'DISPOSAL') {
      payload.grossWeight = Number(gross);
      if (tare !== '') payload.tareWeight = Number(tare);
      if (volume !== '') payload.wasteVolume = Number(volume);
    } else if (category === 'REFUEL') {
      payload.fuelRequestedLiters = Number(requested);
      // Only an approver submits "disetujui"; otherwise the server defaults it.
      if (canApprove && approved !== '') payload.fuelApprovedLiters = Number(approved);
    }
    try {
      await recordTrip(trip.id, payload);
      notify.success('Perjalanan berhasil dicatat.');
      onOpenChange(false);
      onRecorded();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mencatat trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={trip !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{TITLES[category] ?? 'Catat Perjalanan'}</DialogTitle>
          <DialogDescription>{trip?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label required>Waktu Aktual</Label>
              <TimePicker value={time} onValueChange={setTime} presets={false} />
            </div>
            <div className="space-y-1.5">
              <Label required>Odometer</Label>
              <NumberInput
                value={odometer}
                onValueChange={(v) => setOdometer(Number.isNaN(v) ? '' : v)}
                unit="km"
                min={0}
              />
            </div>
          </div>

          {category === 'DISPOSAL' ? (
            <>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Berat Tara</Label>
                  <NumberInput
                    value={tare}
                    onValueChange={(v) => setTare(Number.isNaN(v) ? '' : v)}
                    unit="kg"
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Berat Kotor</Label>
                  <NumberInput
                    value={gross}
                    onValueChange={(v) => setGross(Number.isNaN(v) ? '' : v)}
                    unit="kg"
                    min={0}
                    error={grossInvalid}
                  />
                </div>
              </div>
              <div
                className={`rounded-base border p-3 ${net !== null && net >= 0 ? 'border-success-500 bg-success-50' : 'border-neutral-200 bg-neutral-50'}`}
              >
                <p className="text-label text-neutral-500">Berat Bersih (otomatis)</p>
                <p className="text-h3 font-bold tabular-nums text-success-700">
                  {net !== null ? formatWeight(Math.max(0, net)) : '—'}
                </p>
              </div>
              {grossInvalid && gross !== '' ? (
                <Alert variant="danger">
                  Penimbangan tidak valid: berat bersih tidak boleh negatif.
                </Alert>
              ) : null}
              <div className="space-y-1.5">
                <Label>Volume (m³)</Label>
                <NumberInput
                  value={volume}
                  onValueChange={(v) => setVolume(Number.isNaN(v) ? '' : v)}
                  min={0}
                />
              </div>
            </>
          ) : null}

          {category === 'PICKUP' ? (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label>Berat Tara</Label>
                <NumberInput
                  value={tare}
                  onValueChange={(v) => setTare(Number.isNaN(v) ? '' : v)}
                  unit="kg"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Volume (m³)</Label>
                <NumberInput
                  value={volume}
                  onValueChange={(v) => setVolume(Number.isNaN(v) ? '' : v)}
                  min={0}
                />
              </div>
            </div>
          ) : null}

          {category === 'REFUEL' ? (
            <>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label required>Jumlah Diminta</Label>
                  <NumberInput
                    value={requested}
                    onValueChange={(v) => setRequested(Number.isNaN(v) ? '' : v)}
                    unit="L"
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jumlah Disetujui</Label>
                  <NumberInput
                    value={canApprove ? approved : requested}
                    onValueChange={(v) => setApproved(Number.isNaN(v) ? '' : v)}
                    unit="L"
                    min={0}
                    disabled={!canApprove}
                  />
                </div>
              </div>
              {!canApprove ? (
                <p className="text-tiny text-neutral-400">
                  Jumlah disetujui mengikuti jumlah diminta (perlu izin persetujuan BBM untuk
                  mengubah).
                </p>
              ) : null}
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} loading={saving} disabled={!canSubmit}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
