'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
  type DeviceFieldsValues,
  deviceFieldsDefaults,
  deviceFieldsSchema,
  dropEmptyImei,
  GpsDeviceFields,
  toDeviceFormValues,
} from '@/components/fleet/gps-device-fields';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Form,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusPill,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatTime } from '@/lib/format';
import { type GpsDeviceDto, gpsDevicesApi, listVehicleDevices } from '@/lib/gps-device-api';
import { type VehicleDto } from '@/lib/master-api';

export interface VehicleDevicesSheetProps {
  vehicle: VehicleDto | null;
  onOpenChange: (open: boolean) => void;
  /** Reload the vehicle list so its GPS-coverage badge reflects a change. */
  onChanged?: () => void;
}

/**
 * Per-vehicle "Perangkat GPS" sheet (Phase 7) — attach, EDIT, or detach a GPS
 * device from the vehicle master. Uses the same shared `<GpsDeviceFields>` block as
 * the `/tracking/devices` registry so both surfaces are field-for-field identical
 * (`vehicleId` is implicit here — it's this vehicle).
 */
export function VehicleDevicesSheet({
  vehicle,
  onOpenChange,
  onChanged,
}: VehicleDevicesSheetProps): JSX.Element {
  const [devices, setDevices] = useState<GpsDeviceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GpsDeviceDto | null>(null);
  // null = add mode; a device = editing that device.
  const [editing, setEditing] = useState<GpsDeviceDto | null>(null);
  const [saving, setSaving] = useState(false);

  const vehicleId = vehicle?.id ?? null;
  const form = useForm<DeviceFieldsValues>({
    // Cast mirrors CrudFormDialog: Zod 4's `z.coerce.number()` widens the resolver's
    // input type (priority: unknown), which tsc rejects against the output type.
    resolver: zodResolver(deviceFieldsSchema as never) as Resolver<DeviceFieldsValues>,
    defaultValues: deviceFieldsDefaults,
  });

  const reload = useCallback(async (): Promise<void> => {
    if (vehicleId === null) {
      return;
    }
    setLoading(true);
    try {
      setDevices(await listVehicleDevices(vehicleId));
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat perangkat.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId !== null) {
      setEditing(null);
      form.reset(deviceFieldsDefaults);
      void reload();
    }
    // form is stable for the sheet's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, reload]);

  const startEdit = (device: GpsDeviceDto): void => {
    setEditing(device);
    form.reset(toDeviceFormValues(device));
  };

  const cancelEdit = (): void => {
    setEditing(null);
    form.reset(deviceFieldsDefaults);
  };

  const onSubmit = async (values: DeviceFieldsValues): Promise<void> => {
    if (vehicleId === null) {
      return;
    }
    setSaving(true);
    try {
      const payload = dropEmptyImei(values);
      if (editing) {
        await gpsDevicesApi.update(editing.id, payload);
        notify.success('Perangkat GPS diperbarui.');
      } else {
        await gpsDevicesApi.create({ vehicleId, ...payload });
        notify.success('Perangkat GPS ditautkan.');
      }
      setEditing(null);
      form.reset(deviceFieldsDefaults);
      await reload();
      onChanged?.();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan perangkat.');
    } finally {
      setSaving(false);
    }
  };

  const onDetach = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    try {
      await gpsDevicesApi.remove(deleteTarget.id);
      notify.success('Perangkat GPS dilepas.');
      if (editing?.id === deleteTarget.id) {
        cancelEdit();
      }
      setDeleteTarget(null);
      await reload();
      onChanged?.();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal melepas perangkat.');
    }
  };

  return (
    <Sheet open={vehicle !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,520px)]">
        <SheetHeader>
          <SheetTitle>Perangkat GPS — {vehicle?.plateNumber}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {loading ? (
            <Skeleton className="h-24" />
          ) : devices.length === 0 ? (
            <EmptyState
              illustration="no-results"
              title="Belum ada perangkat"
              description="Kendaraan ini belum terlacak GPS. Tautkan sebuah perangkat di bawah."
            />
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
              {devices.map((device) => (
                <li key={device.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-body-sm font-medium text-neutral-900">
                      <span className="font-mono">{device.imei ?? device.deviceId}</span> ·{' '}
                      {device.provider}
                    </p>
                    <p className="text-tiny text-neutral-500">
                      {device.lastPingAt
                        ? `Ping terakhir ${formatDateDisplay(device.lastPingAt)} ${formatTime(device.lastPingAt)}`
                        : 'Belum pernah mengirim posisi'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill
                      domain="gpsDevice"
                      value={device.active ? device.status : 'offline'}
                    />
                    <ProtectedAction permission="gps-device:update">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Ubah perangkat"
                        onClick={() => startEdit(device)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                    </ProtectedAction>
                    <ProtectedAction permission="gps-device:delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-danger-600"
                        aria-label="Lepas perangkat"
                        onClick={() => setDeleteTarget(device)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </ProtectedAction>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <ProtectedAction permission={editing ? 'gps-device:update' : 'gps-device:create'}>
            <Form {...form}>
              <form
                onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                className="space-y-3 rounded-lg border border-neutral-200 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-label font-semibold text-neutral-700">
                    {editing ? 'Ubah perangkat' : 'Tautkan perangkat'}
                  </p>
                  {editing ? (
                    <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                      Batal
                    </Button>
                  ) : null}
                </div>
                <GpsDeviceFields />
                <Button type="submit" loading={saving}>
                  {editing ? 'Simpan' : 'Tautkan'}
                </Button>
              </form>
            </Form>
          </ProtectedAction>
        </SheetBody>
      </SheetContent>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Lepas perangkat GPS?"
        description="Kendaraan tidak akan terlacak GPS lagi sampai perangkat lain ditautkan."
        confirmLabel="Lepas"
        onConfirm={() => void onDetach()}
      />
    </Sheet>
  );
}
