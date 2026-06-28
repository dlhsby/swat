'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { type SelectOption, SelectField, TimeField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { TripTemplatesSheet } from '@/components/scheduling/trip-templates-sheet';
import { Badge, DropdownMenuItem } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceManager } from '@/hooks/use-resource-manager';
import {
  type ScheduleTemplateDto,
  type DriverDto,
  type VehicleDto,
  scheduleTemplatesApi,
  driversApi,
  vehiclesApi,
} from '@/lib/master-api';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const schema = z
  .object({
    vehicleId: z.string().uuid('Kendaraan wajib dipilih'),
    driverId: z.string().uuid('Pengemudi wajib dipilih'),
    departTime: z.string().regex(TIME_RE, 'Waktu harus berformat HH:mm'),
    returnTime: z.string().regex(TIME_RE, 'Waktu harus berformat HH:mm'),
  })
  .refine((d) => d.departTime < d.returnTime, {
    message: 'Waktu berangkat harus sebelum waktu kembali.',
    path: ['returnTime'],
  });
type Values = z.infer<typeof schema>;
const defaults: Values = { vehicleId: '', driverId: '', departTime: '', returnTime: '' };
const toForm = (r: ScheduleTemplateDto): Values => ({
  vehicleId: r.vehicleId,
  driverId: r.driverId,
  departTime: r.departTime,
  returnTime: r.returnTime,
});
const vehicleOption = (v: VehicleDto): SelectOption => ({ value: v.id, label: v.plateNumber });
const driverOption = (d: DriverDto): SelectOption => ({ value: d.id, label: d.name });

export default function ScheduleTemplatesPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(scheduleTemplatesApi, (r) => r.id);
  const { options: vehicles } = useOptions(vehiclesApi.list, vehicleOption);
  const { options: drivers } = useOptions(driversApi.list, driverOption);
  const [templatesFor, setTemplatesFor] = useState<ScheduleTemplateDto | null>(null);

  const columns = useMemo<ColumnDef<ScheduleTemplateDto, unknown>[]>(
    () => [
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.vehiclePlate}</span>
        ),
      },
      { accessorKey: 'driverName', header: 'Pengemudi', meta: { label: 'Pengemudi' } },
      {
        accessorKey: 'departTime',
        header: 'Berangkat',
        meta: { label: 'Berangkat' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.departTime}</span>,
      },
      {
        accessorKey: 'returnTime',
        header: 'Kembali',
        meta: { label: 'Kembali' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.returnTime}</span>,
      },
      {
        accessorKey: 'tripTemplateCount',
        header: 'Template Perjalanan',
        meta: { label: 'Template Perjalanan' },
        cell: ({ row }) => <Badge appearance="count">{row.original.tripTemplateCount}</Badge>,
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
              resource="schedule-template"
              onView={() => manager.openView(row.original)}
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                <ProtectedAction permission="trip-template:read">
                  <DropdownMenuItem onSelect={() => setTemplatesFor(row.original)}>
                    <ListChecks aria-hidden />
                    Kelola Template Perjalanan
                  </DropdownMenuItem>
                </ProtectedAction>
              }
            />
          </div>
        ),
      },
    ],
    [manager],
  );

  return (
    <CrudListShell
      title={t('scheduleTemplates')}
      resource="schedule-template"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari kendaraan / pengemudi…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{
          create: 'Tambah Template Jadwal Pengangkutan',
          edit: 'Ubah Template Jadwal Pengangkutan',
          view: 'Lihat Template Jadwal Pengangkutan',
        }}
        className="max-w-[520px]"
      >
        <div className="grid gap-4">
          <SelectField
            name="vehicleId"
            label="Kendaraan"
            required
            options={vehicles}
            placeholder="Pilih kendaraan"
          />
          <SelectField
            name="driverId"
            label="Pengemudi"
            required
            options={drivers}
            placeholder="Pilih pengemudi"
          />
          <TimeField name="departTime" label="Berangkat" required />
          <TimeField name="returnTime" label="Kembali" required />
        </div>
      </CrudFormDialog>

      <TripTemplatesSheet
        schedule={templatesFor}
        onOpenChange={(open) => !open && setTemplatesFor(null)}
        onMutated={() => void manager.reload()}
      />
    </CrudListShell>
  );
}
