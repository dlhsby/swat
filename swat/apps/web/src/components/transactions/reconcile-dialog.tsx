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
  Label,
  NumberInput,
  TimePicker,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { combineDateTimeWIB, nowTimeWIB, timeOfWIB } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { recordDepart, recordReturn } from '@/lib/transactions-api';
import { type HaulAssignmentDto } from '@/lib/types/transactions';

export interface ReconcileDialogProps {
  assignment: HaulAssignmentDto | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

/** Record / reconcile a haul assignment's departure and return legs. */
export function ReconcileDialog({
  assignment,
  onOpenChange,
  onChanged,
}: ReconcileDialogProps): JSX.Element {
  const [departTime, setDepartTime] = useState('');
  const [departOdo, setDepartOdo] = useState<number | ''>('');
  const [returnTime, setReturnTime] = useState('');
  const [returnOdo, setReturnOdo] = useState<number | ''>('');
  const [savingDepart, setSavingDepart] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);

  const departed = assignment?.departActualOdometer != null;

  useEffect(() => {
    if (!assignment) {
      return;
    }
    setDepartTime(timeOfWIB(assignment.departActualTime) || nowTimeWIB());
    setDepartOdo(assignment.departActualOdometer ?? assignment.departTargetOdometer ?? '');
    setReturnTime(timeOfWIB(assignment.returnActualTime) || nowTimeWIB());
    setReturnOdo(assignment.returnActualOdometer ?? assignment.returnTargetOdometer ?? '');
  }, [assignment]);

  const submitDepart = async (): Promise<void> => {
    if (!assignment || departTime === '' || departOdo === '') {
      return;
    }
    setSavingDepart(true);
    try {
      await recordDepart(assignment.id, {
        actualOdometer: Number(departOdo),
        actualTime: combineDateTimeWIB(assignment.operationDate, departTime),
      });
      notify.success('Keberangkatan dicatat.');
      onChanged();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mencatat keberangkatan.');
    } finally {
      setSavingDepart(false);
    }
  };

  const submitReturn = async (): Promise<void> => {
    if (!assignment || returnTime === '' || returnOdo === '') {
      return;
    }
    setSavingReturn(true);
    try {
      await recordReturn(assignment.id, {
        actualOdometer: Number(returnOdo),
        actualTime: combineDateTimeWIB(assignment.operationDate, returnTime),
      });
      notify.success('Kepulangan dicatat. Odometer kendaraan diperbarui.');
      onOpenChange(false);
      onChanged();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mencatat kepulangan.');
    } finally {
      setSavingReturn(false);
    }
  };

  return (
    <Dialog open={assignment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Rekalibrasi Berangkat / Kembali</DialogTitle>
          <DialogDescription>{assignment?.driverName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Departure */}
          <section className="space-y-3 rounded-lg border border-neutral-200 p-3">
            <p className="text-label font-semibold text-neutral-700">Berangkat</p>
            <p className="text-tiny text-neutral-500">
              Target odometer {formatNumber(assignment?.departTargetOdometer ?? 0)} km
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>Waktu</Label>
                <TimePicker value={departTime} onValueChange={setDepartTime} presets={false} />
              </div>
              <div className="space-y-1.5">
                <Label required>Odometer</Label>
                <NumberInput
                  value={departOdo}
                  onValueChange={(v) => setDepartOdo(Number.isNaN(v) ? '' : v)}
                  unit="km"
                  min={0}
                />
              </div>
            </div>
            <Button size="sm" onClick={() => void submitDepart()} loading={savingDepart}>
              Simpan Berangkat
            </Button>
          </section>

          {/* Return */}
          <section className="space-y-3 rounded-lg border border-neutral-200 p-3">
            <p className="text-label font-semibold text-neutral-700">Kembali</p>
            {!departed ? (
              <p className="text-tiny text-warning-700">Catat keberangkatan terlebih dahulu.</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>Waktu</Label>
                <TimePicker value={returnTime} onValueChange={setReturnTime} presets={false} />
              </div>
              <div className="space-y-1.5">
                <Label required>Odometer</Label>
                <NumberInput
                  value={returnOdo}
                  onValueChange={(v) => setReturnOdo(Number.isNaN(v) ? '' : v)}
                  unit="km"
                  min={0}
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => void submitReturn()}
              loading={savingReturn}
              disabled={!departed}
            >
              Simpan Kembali
            </Button>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
