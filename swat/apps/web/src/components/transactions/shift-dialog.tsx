'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  TimePicker,
  notify,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { type DriverDto, type VehicleDto, driversApi, vehiclesApi } from '@/lib/master-api';
import { addAssignment, addHaul } from '@/lib/transactions-api';

/** `null` = closed. `shift` adds a driver to a vehicle's haul; `vehicle` adds a haul. */
export type ShiftTarget =
  | { mode: 'shift'; haulId: string; vehiclePlate: string }
  | { mode: 'vehicle'; dayId: string }
  | null;

/**
 * Add a driver-shift to an existing vehicle's haul, or add a whole vehicle (new
 * haul + first shift) to the day (Phase 7.8, T-730). Times are optional HH:mm.
 */
export function ShiftDialog({
  target,
  onOpenChange,
  onChanged,
}: {
  target: ShiftTarget;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}): JSX.Element {
  const open = target !== null;
  const isVehicleMode = target?.mode === 'vehicle';
  const { rows: vehicles } = useResourceList<VehicleDto>(vehiclesApi.list);
  const { rows: drivers } = useResourceList<DriverDto>(driversApi.list);

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [departTime, setDepartTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setVehicleId('');
      setDriverId('');
      setDepartTime('');
      setReturnTime('');
    }
  }, [open]);

  const vehicleOptions = useMemo(
    () => vehicles.map((v) => ({ value: v.id, label: v.plateNumber })),
    [vehicles],
  );
  const driverOptions = useMemo(
    () => drivers.map((d) => ({ value: d.id, label: d.name })),
    [drivers],
  );

  const valid = driverId !== '' && (!isVehicleMode || vehicleId !== '');

  const onSubmit = async (): Promise<void> => {
    if (!target || !valid) return;
    setSaving(true);
    try {
      if (target.mode === 'shift') {
        await addAssignment({
          haulId: target.haulId,
          driverId,
          departTime: departTime || undefined,
          returnTime: returnTime || undefined,
        });
        notify.success('Shift ditambahkan.');
      } else {
        await addHaul({
          transactionDayId: target.dayId,
          vehicleId,
          driverId,
          departTime: departTime || undefined,
          returnTime: returnTime || undefined,
        });
        notify.success('Kendaraan ditambahkan.');
      }
      onChanged();
      onOpenChange(false);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menambah.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isVehicleMode ? 'Tambah Kendaraan' : 'Tambah Shift'}</DialogTitle>
          <DialogDescription>
            {isVehicleMode
              ? 'Tambahkan kendaraan baru beserta pengemudi shift pertamanya ke hari ini.'
              : `Tambahkan shift pengemudi untuk ${target?.mode === 'shift' ? target.vehiclePlate : ''}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isVehicleMode ? (
            <div className="space-y-1.5">
              <Label required>Kendaraan</Label>
              <Combobox
                options={vehicleOptions}
                value={vehicleId}
                onValueChange={setVehicleId}
                placeholder="Pilih kendaraan"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label required>Pengemudi</Label>
            <Combobox
              options={driverOptions}
              value={driverId}
              onValueChange={setDriverId}
              placeholder="Pilih pengemudi"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Berangkat</Label>
              <TimePicker value={departTime} onValueChange={setDepartTime} presets={false} />
            </div>
            <div className="space-y-1.5">
              <Label>Kembali</Label>
              <TimePicker value={returnTime} onValueChange={setReturnTime} presets={false} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} loading={saving} disabled={!valid}>
            Tambah
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
