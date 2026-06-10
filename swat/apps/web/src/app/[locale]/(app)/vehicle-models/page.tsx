'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { z } from 'zod';

import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { NumberField, type SelectOption, SelectField, TextField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { useOptions } from '@/hooks/use-options';
import { useResourceManager } from '@/hooks/use-resource-manager';
import {
  type FuelDto,
  type VehicleApplicationDto,
  type VehicleModelDto,
  fuelsApi,
  vehicleApplicationsApi,
  vehicleModelsApi,
} from '@/lib/master-api';

const schema = z.object({
  applicationId: z.string().uuid('Aplikasi kendaraan wajib dipilih'),
  fuelId: z.string().uuid('Bahan bakar wajib dipilih'),
  brand: z.string().min(1, 'Merek wajib diisi').max(100, 'Merek maksimal 100 karakter'),
  fuelTankCapacity: z.coerce.number().int().min(1, 'Kapasitas tangki harus lebih dari 0'),
  normalFuelRatio: z.coerce.number().int('Rasio harus bilangan bulat').min(1, 'Rasio minimal 1'),
  normalTareWeight: z.coerce.number().int().min(1, 'Berat kosong harus lebih dari 0'),
  maxNetLoad: z.coerce.number().int('Muatan harus bilangan bulat').min(0).optional(),
  maxNetVolume: z.coerce.number().int('Volume harus bilangan bulat').min(0).optional(),
  wheelCount: z.coerce.number().int().min(1, 'Jumlah roda harus lebih dari 0'),
});
type Values = z.infer<typeof schema>;
const defaults: Values = {
  applicationId: '',
  fuelId: '',
  brand: '',
  fuelTankCapacity: 1,
  normalFuelRatio: 1,
  normalTareWeight: 1,
  maxNetLoad: undefined,
  maxNetVolume: undefined,
  wheelCount: 4,
};
const toForm = (r: VehicleModelDto): Values => ({
  applicationId: r.applicationId,
  fuelId: r.fuelId,
  brand: r.brand,
  fuelTankCapacity: r.fuelTankCapacity,
  normalFuelRatio: r.normalFuelRatio,
  normalTareWeight: r.normalTareWeight,
  maxNetLoad: r.maxNetLoad ?? undefined,
  maxNetVolume: r.maxNetVolume ?? undefined,
  wheelCount: r.wheelCount,
});
const appOption = (a: VehicleApplicationDto): SelectOption => ({ value: a.id, label: a.name });
const fuelOption = (f: FuelDto): SelectOption => ({ value: f.id, label: f.name });

export default function VehicleModelsPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(vehicleModelsApi, (r) => r.id);
  const { options: apps } = useOptions(vehicleApplicationsApi.list, appOption);
  const { options: fuels } = useOptions(fuelsApi.list, fuelOption);

  const columns = useMemo<ColumnDef<VehicleModelDto, unknown>[]>(
    () => [
      { accessorKey: 'brand', header: 'Merek/Model', meta: { label: 'Merek/Model' } },
      { accessorKey: 'applicationName', header: 'Aplikasi', meta: { label: 'Aplikasi' } },
      { accessorKey: 'fuelName', header: 'Bahan Bakar', meta: { label: 'Bahan Bakar' } },
      {
        accessorKey: 'wheelCount',
        header: 'Roda',
        meta: { label: 'Roda' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.wheelCount}</span>,
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
              resource="vehicle-model"
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
      title={t('vehicleModels')}
      resource="vehicle-model"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari model…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Model', edit: 'Ubah Model' }}
      >
        <TextField name="brand" label="Merek/Model" required placeholder="Hino Dutro" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="applicationId"
            label="Aplikasi"
            required
            options={apps}
            placeholder="Pilih aplikasi"
          />
          <SelectField
            name="fuelId"
            label="Bahan Bakar"
            required
            options={fuels}
            placeholder="Pilih bahan bakar"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="fuelTankCapacity" label="Kapasitas Tangki" required unit="L" min={1} />
          <NumberField name="wheelCount" label="Jumlah Roda" required min={1} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            name="normalTareWeight"
            label="Berat Kosong Normal"
            required
            unit="kg"
            min={1}
          />
          <NumberField name="normalFuelRatio" label="Rasio BBM Normal" required min={1} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="maxNetLoad" label="Muatan Bersih Maks" unit="kg" min={0} />
          <NumberField name="maxNetVolume" label="Volume Bersih Maks" unit="m³" min={0} />
        </div>
      </CrudFormDialog>
    </CrudListShell>
  );
}
