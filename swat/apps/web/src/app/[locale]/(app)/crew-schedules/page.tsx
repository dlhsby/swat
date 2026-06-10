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
  type CrewScheduleDto,
  type DriverDto,
  type VehicleDto,
  crewSchedulesApi,
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
const toForm = (r: CrewScheduleDto): Values => ({
  vehicleId: r.vehicleId,
  driverId: r.driverId,
  departTime: r.departTime,
  returnTime: r.returnTime,
});
const vehicleOption = (v: VehicleDto): SelectOption => ({ value: v.id, label: v.plateNumber });
const driverOption = (d: DriverDto): SelectOption => ({ value: d.id, label: d.name });

export default function CrewSchedulesPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(crewSchedulesApi, (r) => r.id);
  const { options: vehicles } = useOptions(vehiclesApi.list, vehicleOption);
  const { options: drivers } = useOptions(driversApi.list, driverOption);
  const [templatesFor, setTemplatesFor] = useState<CrewScheduleDto | null>(null);

  const columns = useMemo<ColumnDef<CrewScheduleDto, unknown>[]>(
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
        header: 'Trayek',
        meta: { label: 'Trayek' },
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
              resource="crew-schedule"
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                <ProtectedAction permission="trip-template:read">
                  <DropdownMenuItem onSelect={() => setTemplatesFor(row.original)}>
                    <ListChecks aria-hidden />
                    Kelola Trayek
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
      title={t('crewSchedules')}
      resource="crew-schedule"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari kendaraan / pengemudi…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Jadwal Kru', edit: 'Ubah Jadwal Kru' }}
        className="max-w-[520px]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
      />
    </CrudListShell>
  );
}
