'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Inbox, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
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
import { UnmatchedDevicesSheet } from '@/components/tracking/unmatched-devices-sheet';
import { Button, type ComboboxOption, notify, StatusPill } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatTime } from '@/lib/format';
import { type GpsDeviceDto, gpsDevicesApi, syncGpsidVehicles } from '@/lib/gps-device-api';
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
    () => vehicles.map((v: VehicleDto) => ({ value: v.id, label: `${v.plateNumber} · ${v.modelBrand}` })),
    [vehicles],
  );
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Pull the GPS.id vehicle roster and reconcile devices by plate. A submit-level
  // result → toast; conflicts/unmatched plates surface as follow-up warnings.
  const handleSync = async (): Promise<void> => {
    setSyncing(true);
    try {
      const r = await syncGpsidVehicles();
      notify.success(
        `Sinkronisasi GPS.id selesai — ${r.createdCount} dibuat, ${r.remappedCount} dipetakan ulang, ${r.unchangedCount} tetap.`,
      );
      if (r.conflictCount > 0) {
        notify.error(
          `${r.conflictCount} perangkat dinonaktifkan — kendaraannya sudah punya perangkat aktif.`,
        );
      }
      if (r.unmatchedVehicles.length > 0) {
        notify.error(
          `${r.unmatchedVehicles.length} kendaraan GPS.id tak cocok dengan data SWAT (periksa nomor polisi).`,
        );
      }
      await manager.reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyinkronkan dari GPS.id.');
    } finally {
      setSyncing(false);
    }
  };

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
          <span className="font-mono text-body-sm">{row.original.imei ?? row.original.deviceId}</span>
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
          <StatusPill domain="gpsDevice" value={row.original.active ? row.original.status : 'offline'} />
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
          <div className="text-right">
            <RowActions
              resource="gps-device"
              onView={() => manager.openView(row.original)}
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [manager],
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
          <ProtectedAction permission="gps-device:create">
            <Button
              variant="secondary"
              size="sm"
              className="ml-2"
              onClick={() => void handleSync()}
              loading={syncing}
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Sinkronkan GPS.id
            </Button>
          </ProtectedAction>
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
            Pastikan webhook GPS.id sudah didaftarkan ke SWAT (URL webhook + token), lalu petakan IMEI
            yang masuk lewat tombol “IMEI tak dikenal”. Anda juga bisa menambahkan perangkat manual di
            atas.
          </p>
        </div>
      ) : null}
    </CrudListShell>
  );
}
