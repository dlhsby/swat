'use client';

import { Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import {
  type GpsDeviceDto,
  gpsDevicesApi,
  listVehicleDevices,
} from '@/lib/gps-device-api';
import { type VehicleDto } from '@/lib/master-api';

const DEVICE_TYPE_OPTIONS = [
  { value: 'gps-hardware', label: 'Perangkat keras GPS' },
  { value: 'mobile-app', label: 'Aplikasi ponsel' },
];

export interface VehicleDevicesSheetProps {
  vehicle: VehicleDto | null;
  onOpenChange: (open: boolean) => void;
  /** Reload the vehicle list so its GPS-coverage badge reflects a change. */
  onChanged?: () => void;
}

/**
 * Per-vehicle "Perangkat GPS" sheet (Phase 7) — attach a GPS device to this
 * vehicle (the registry IS the tracked flag) or detach it, without leaving the
 * vehicle master. Mirrors the driver-SIM sheet pattern.
 */
export function VehicleDevicesSheet({
  vehicle,
  onOpenChange,
  onChanged,
}: VehicleDevicesSheetProps): JSX.Element {
  const [devices, setDevices] = useState<GpsDeviceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GpsDeviceDto | null>(null);

  const [deviceId, setDeviceId] = useState('');
  const [imei, setImei] = useState('');
  const [deviceType, setDeviceType] = useState('gps-hardware');
  const [priority, setPriority] = useState('0');
  const [saving, setSaving] = useState(false);

  const vehicleId = vehicle?.id ?? null;

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
      setDeviceId('');
      setImei('');
      setDeviceType('gps-hardware');
      setPriority('0');
      void reload();
    }
  }, [vehicleId, reload]);

  const onAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (vehicleId === null || !deviceId) {
      return;
    }
    setSaving(true);
    try {
      await gpsDevicesApi.create({
        vehicleId,
        deviceId,
        deviceType,
        provider: 'gpsid',
        priority: Number(priority) || 0,
        ...(imei ? { imei } : {}),
      });
      notify.success('Perangkat GPS ditautkan.');
      setDeviceId('');
      setImei('');
      await reload();
      onChanged?.();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menautkan perangkat.');
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

          <ProtectedAction permission="gps-device:create">
            <form
              onSubmit={(e) => void onAdd(e)}
              className="space-y-3 rounded-lg border border-neutral-200 p-3"
            >
              <p className="text-label font-semibold text-neutral-700">Tautkan perangkat</p>
              <div className="space-y-1.5">
                <Label htmlFor="dev-id" required>
                  ID Perangkat / IMEI
                </Label>
                <Input
                  id="dev-id"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  maxLength={64}
                  placeholder="mis. 350000000000999"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-imei">IMEI (opsional)</Label>
                <Input
                  id="dev-imei"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="Default mengikuti ID perangkat"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-type">Jenis Perangkat</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger id="dev-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-priority">Prioritas</Label>
                <Input
                  id="dev-priority"
                  type="number"
                  min={0}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>
              <Button type="submit" loading={saving} disabled={!deviceId}>
                Tautkan
              </Button>
            </form>
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
