'use client';

import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NumberInput,
  TimePicker,
  notify,
} from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/lib/api-error';
import { combineDateTimeWIB, nowTimeWIB, timeOfWIB } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { type RecordTripInput, recordTrip } from '@/lib/transactions-api';
import { type TripDto } from '@/lib/types/transactions';

export interface ActivityEditDialogProps {
  /** The recorded activity row to edit (null = closed). */
  trip: TripDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const TITLES: Record<string, string> = {
  PICKUP: 'Ubah Pengambilan Sampah',
  DISPOSAL: 'Ubah Pembuangan Sampah',
  REFUEL: 'Ubah Pengisian BBM',
  DEPART_POOL: 'Ubah Aktivitas Pool',
  RETURN_POOL: 'Ubah Aktivitas Pool',
};

/**
 * Edit a recorded activity's realization — only the fields the entry form
 * captures (time + the kind's measures + notes). The vehicle, location and
 * activity type identify the record and stay fixed; the date is the operation day
 * (the server anchors it), so only the time is editable. Saves via the record
 * endpoint (an edit re-records the same trip).
 */
export function ActivityEditDialog({
  trip,
  onOpenChange,
  onSaved,
}: ActivityEditDialogProps): JSX.Element {
  const { can } = usePermissions();
  const category = trip?.routeCategory ?? 'DEPART_POOL';
  const isDisposal = category === 'DISPOSAL';
  const isRefuel = category === 'REFUEL';
  // A verified trip is locked unless the user can override.
  const lockedVerified = trip?.status === 'VERIFIED' && !can('trip:override');

  const [time, setTime] = useState('');
  const [odometer, setOdometer] = useState<number | ''>('');
  const [gross, setGross] = useState<number | ''>('');
  const [tare, setTare] = useState<number | ''>('');
  const [liters, setLiters] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trip) return;
    setTime(timeOfWIB(trip.actualTime) || nowTimeWIB());
    setOdometer(trip.actualOdometer > 0 ? trip.actualOdometer : '');
    setGross(trip.grossWeight ?? '');
    setTare(trip.tareWeight || '');
    setLiters(trip.fuelApprovedLiters ?? '');
    setNotes(trip.notes ?? '');
  }, [trip]);

  const net = gross !== '' && tare !== '' ? Number(gross) - Number(tare) : null;
  const grossInvalid = isDisposal && (gross === '' || tare === '' || (net !== null && net < 0));

  const valid =
    trip !== null &&
    !lockedVerified &&
    time !== '' &&
    (!isRefuel || liters !== '') &&
    (!isDisposal || !grossInvalid);

  const onSubmit = async (): Promise<void> => {
    if (!trip || !valid) return;
    setSaving(true);
    try {
      const payload: RecordTripInput = {
        actualTime: combineDateTimeWIB(trip.operationDate, time),
        // Speedometer is optional (and never read for disposal) → -1 sentinel.
        actualOdometer: isDisposal || odometer === '' ? -1 : Number(odometer),
        // Always send notes so an edit can also clear it.
        notes: notes.trim(),
      };
      if (isRefuel && liters !== '') {
        payload.fuelRequestedLiters = Number(liters);
        payload.fuelApprovedLiters = Number(liters);
      }
      if (isDisposal) {
        payload.grossWeight = Number(gross);
        payload.tareWeight = Number(tare);
      }
      await recordTrip(trip.id, payload);
      notify.success('Aktivitas berhasil diubah.');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mengubah aktivitas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={trip !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{TITLES[category] ?? 'Ubah Aktivitas'}</DialogTitle>
          <DialogDescription>{trip?.routeLabel ?? trip?.name}</DialogDescription>
        </DialogHeader>

        {lockedVerified ? (
          <p className="text-body-sm text-danger-600">
            Trip telah diverifikasi — perlu izin override untuk mengubah.
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Waktu Realisasi</Label>
            <TimePicker value={time} onValueChange={setTime} presets={false} />
          </div>

          {isRefuel ? (
            <div className="space-y-1.5">
              <Label required>Jumlah Isi BBM</Label>
              <NumberInput
                value={liters}
                onValueChange={(v) => setLiters(Number.isNaN(v) ? '' : v)}
                unit="L"
                min={0}
              />
            </div>
          ) : null}

          {isDisposal ? (
            <>
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
              <div className="space-y-1.5">
                <Label required>Berat Kosong Kendaraan</Label>
                <NumberInput
                  value={tare}
                  onValueChange={(v) => setTare(Number.isNaN(v) ? '' : v)}
                  unit="kg"
                  min={0}
                />
              </div>
              <div
                className={`rounded-base border p-3 ${
                  net === null
                    ? 'border-neutral-200 bg-neutral-50'
                    : net >= 0
                      ? 'border-success-500 bg-success-50'
                      : 'border-danger-500 bg-danger-50'
                }`}
              >
                <p className="text-label text-neutral-500">Berat Bersih (otomatis)</p>
                <p
                  className={`text-h3 font-bold tabular-nums ${
                    net !== null && net < 0 ? 'text-danger-700' : 'text-success-700'
                  }`}
                >
                  {net !== null ? `${formatNumber(net)} kg` : '—'}
                </p>
                {net !== null && net < 0 ? (
                  <p className="text-tiny text-danger-600">
                    Berat bersih tidak boleh negatif (berat kotor &lt; berat kosong).
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {/* Speedometer — optional, omitted for disposal (sent as -1). */}
          {!isDisposal ? (
            <div className="space-y-1.5">
              <Label>Nominal Speedometer (opsional)</Label>
              <NumberInput
                value={odometer}
                onValueChange={(v) => setOdometer(Number.isNaN(v) ? '' : v)}
                unit="km"
                min={0}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Keterangan</Label>
            <Input
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
          <Button onClick={() => void onSubmit()} loading={saving} disabled={!valid}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
