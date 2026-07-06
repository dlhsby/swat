'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Inbox, LocateFixed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { SelectField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import {
  deviceFieldsDefaults,
  deviceFieldsSchema,
  dropEmptyImei,
  GpsDeviceFields,
  toDeviceFormValues,
} from '@/components/fleet/gps-device-fields';
import { GpsSyncButton } from '@/components/tracking/gps-sync-button';
import { PullAllPositionsButton } from '@/components/tracking/pull-all-positions-button';
import { UnmatchedDevicesSheet } from '@/components/tracking/unmatched-devices-sheet';
import { Button, type ComboboxOption, DropdownMenuItem, StatusPill, notify } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatTime } from '@/lib/format';
import { type GpsDeviceDto, gpsDevicesApi, pullDevicePosition } from '@/lib/gps-device-api';
import { type VehicleDto, vehiclesApi } from '@/lib/master-api';

// The registry page adds `vehicleId` on top of the shared device fields.
const schema = deviceFieldsSchema.extend({
  vehicleId: z.string().uuid('Kendaraan wajib dipilih'),
});
type Values = z.infer<typeof schema>;

const defaults: Values = { vehicleId: '', ...deviceFieldsDefaults };
const toForm = (d: GpsDeviceDto): Values => ({ vehicleId: d.vehicleId, ...toDeviceFormValues(d) });
const buildPayload = (values: Values): Record<string, unknown> => dropEmptyImei(values);

export default function GpsDevicesPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(gpsDevicesApi, (r) => r.id);
  const { rows: vehicles } = useResourceList(vehiclesApi.list);
  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      vehicles.map((v: VehicleDto) => ({
        value: v.id,
        label: `${v.plateNumber} · ${v.modelBrand}`,
      })),
    [vehicles],
  );
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);
  const [pullingId, setPullingId] = useState<string | null>(null);

  // On-demand "Tarik Posisi" — pull the device's latest GPS.id position now instead of
  // waiting for the scheduled job, then refresh the list so online/last-ping update.
  const onPull = useCallback(
    async (device: GpsDeviceDto): Promise<void> => {
      setPullingId(device.id);
      try {
        const res = await pullDevicePosition(device.id);
        if (res.latest) {
          notify.success(
            `Posisi terkini ditarik (${res.enqueued} titik)`,
            `${formatDateDisplay(res.latest.recordedAt)} ${formatTime(res.latest.recordedAt)}`,
          );
        } else {
          notify.info('Belum ada data posisi terbaru dari GPS.id untuk perangkat ini.');
        }
        await manager.reload();
      } catch (err) {
        notify.error(err instanceof ApiError ? err.message : 'Gagal menarik posisi.');
      } finally {
        setPullingId(null);
      }
    },
    [manager],
  );

  const columns = useMemo<ColumnDef<GpsDeviceDto, unknown>[]>(
    () => [
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.vehiclePlate}</span>
        ),
      },
      {
        accessorKey: 'imei',
        header: 'IMEI / ID',
        meta: { label: 'IMEI / ID' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm">
            {row.original.imei ?? row.original.deviceId}
          </span>
        ),
      },
      {
        accessorKey: 'deviceType',
        header: 'Jenis',
        meta: { label: 'Jenis' },
        cell: ({ row }) => (
          <span>{row.original.deviceType === 'gps-hardware' ? 'Perangkat keras' : 'Aplikasi'}</span>
        ),
      },
      { accessorKey: 'provider', header: 'Penyedia', meta: { label: 'Penyedia' } },
      { accessorKey: 'priority', header: 'Prioritas', meta: { label: 'Prioritas' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <StatusPill
            domain="gpsDevice"
            value={row.original.active ? row.original.status : 'offline'}
          />
        ),
      },
      {
        accessorKey: 'lastPingAt',
        header: 'Ping terakhir',
        meta: { label: 'Ping terakhir' },
        cell: ({ row }) => (
          <span className="tabular-nums text-neutral-500">
            {row.original.lastPingAt
              ? `${formatDateDisplay(row.original.lastPingAt)} ${formatTime(row.original.lastPingAt)}`
              : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { label: 'Aksi' },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <RowActions
              resource="gps-device"
              onView={() => manager.openView(row.original)}
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                row.original.imei ? (
                  <ProtectedAction permission="tracking:read">
                    <DropdownMenuItem
                      disabled={pullingId === row.original.id}
                      onSelect={() => void onPull(row.original)}
                    >
                      <LocateFixed aria-hidden />
                      {pullingId === row.original.id ? 'Menarik…' : 'Tarik Posisi'}
                    </DropdownMenuItem>
                  </ProtectedAction>
                ) : null
              }
            />
          </div>
        ),
      },
    ],
    [manager, onPull, pullingId],
  );

  return (
    <CrudListShell
      title={t('gpsDevices')}
      description="Daftar perangkat pelacak dan pemetaan IMEI ke kendaraan."
      resource="gps-device"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari IMEI / kendaraan…"
      toolbar={
        <>
          <GpsSyncButton className="ml-2" onSynced={() => void manager.reload()} />
          <PullAllPositionsButton onPulled={() => void manager.reload()} />
          <Button variant="secondary" size="sm" onClick={() => setUnmatchedOpen(true)}>
            <Inbox className="h-4 w-4" aria-hidden /> IMEI tak dikenal
          </Button>
        </>
      }
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        buildPayload={buildPayload}
        title={{
          create: 'Tambah Perangkat GPS',
          edit: 'Ubah Perangkat GPS',
          view: 'Lihat Perangkat GPS',
        }}
        className="max-w-[560px]"
      >
        <div className="grid gap-4">
          <SelectField
            name="vehicleId"
            label="Kendaraan"
            required
            options={vehicleOptions}
            placeholder="Pilih kendaraan"
          />
          <GpsDeviceFields />
        </div>
      </CrudFormDialog>

      <UnmatchedDevicesSheet
        open={unmatchedOpen}
        onOpenChange={setUnmatchedOpen}
        vehicleOptions={vehicleOptions}
        onMapped={() => void manager.reload()}
      />

      {/* Setup signpost: an empty registry usually means the GPS.id webhook hasn't
          been registered yet — the #1 "nothing shows up" cause. */}
      {!manager.loading && manager.rows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <p className="text-body-sm font-medium text-neutral-800">
            Belum ada perangkat GPS yang melapor.
          </p>
          <p className="mt-1 text-body-sm text-neutral-600">
            Pastikan webhook GPS.id sudah didaftarkan ke SWAT (URL webhook + token), lalu petakan
            IMEI yang masuk lewat tombol “IMEI tak dikenal”. Anda juga bisa menambahkan perangkat
            manual di atas.
          </p>
        </div>
      ) : null}
    </CrudListShell>
  );
}
