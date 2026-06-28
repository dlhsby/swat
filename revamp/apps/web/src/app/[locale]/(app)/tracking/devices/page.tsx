'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import {
  NumberField,
  type SelectOption,
  SelectField,
  SwitchField,
  TextField,
} from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { UnmatchedDevicesSheet } from '@/components/tracking/unmatched-devices-sheet';
import { Button, type ComboboxOption, StatusPill } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { formatDateDisplay, formatTime } from '@/lib/format';
import { type GpsDeviceDto, gpsDevicesApi } from '@/lib/gps-device-api';
import { type VehicleDto, vehiclesApi } from '@/lib/master-api';

const DEVICE_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'gps-hardware', label: 'Perangkat keras GPS' },
  { value: 'mobile-app', label: 'Aplikasi ponsel' },
];

const schema = z.object({
  vehicleId: z.string().uuid('Kendaraan wajib dipilih'),
  deviceId: z.string().min(1, 'ID perangkat / IMEI wajib diisi').max(64),
  // Optional — '' clears it; the backend defaults the IMEI from deviceId for hardware.
  imei: z
    .union([z.string().regex(/^\d{6,20}$/, 'IMEI harus 6–20 digit angka'), z.literal('')])
    .optional(),
  deviceType: z.enum(['gps-hardware', 'mobile-app']),
  provider: z.string().min(1, 'Penyedia wajib diisi').max(20),
  priority: z.coerce.number().int().min(0).max(100),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const defaults: Values = {
  vehicleId: '',
  deviceId: '',
  imei: '',
  deviceType: 'gps-hardware',
  provider: 'gpsid',
  priority: 0,
  active: true,
};
const toForm = (d: GpsDeviceDto): Values => ({
  vehicleId: d.vehicleId,
  deviceId: d.deviceId,
  imei: d.imei ?? '',
  deviceType: d.deviceType,
  provider: d.provider,
  priority: d.priority,
  active: d.active,
});
// Drop an empty IMEI so the backend regex doesn't reject '' (it defaults from deviceId).
const buildPayload = (values: Values): Record<string, unknown> => {
  const { imei, ...rest } = values;
  return imei ? { ...rest, imei } : rest;
};

export default function GpsDevicesPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(gpsDevicesApi, (r) => r.id);
  const { rows: vehicles } = useResourceList(vehiclesApi.list);
  const vehicleOptions = useMemo<ComboboxOption[]>(
    () => vehicles.map((v: VehicleDto) => ({ value: v.id, label: `${v.plateNumber} · ${v.modelBrand}` })),
    [vehicles],
  );
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);

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
        <Button variant="secondary" size="sm" onClick={() => setUnmatchedOpen(true)}>
          <Inbox className="h-4 w-4" aria-hidden /> IMEI tak dikenal
        </Button>
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
          <TextField
            name="deviceId"
            label="ID Perangkat / IMEI"
            required
            placeholder="mis. 350000000000999"
          />
          <TextField name="imei" label="IMEI" placeholder="Opsional — default mengikuti ID perangkat" />
          <SelectField
            name="deviceType"
            label="Jenis Perangkat"
            required
            options={DEVICE_TYPE_OPTIONS}
            placeholder="Pilih jenis"
          />
          <TextField name="provider" label="Penyedia" required placeholder="gpsid" />
          <NumberField name="priority" label="Prioritas" required min={0} max={100} />
          <SwitchField name="active" label="Aktif" />
        </div>
      </CrudFormDialog>

      <UnmatchedDevicesSheet
        open={unmatchedOpen}
        onOpenChange={setUnmatchedOpen}
        vehicleOptions={vehicleOptions}
        onMapped={() => void manager.reload()}
      />
    </CrudListShell>
  );
}
