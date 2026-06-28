'use client';

import { type ColumnDef } from '@tanstack/react-table';
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
  type VehicleTypeDto,
  type VehicleModelDto,
  fuelsApi,
  vehicleTypesApi,
  vehicleModelsApi,
} from '@/lib/master-api';

// Minimums mirror the legacy `kategorikendaraan` structure: the NOT-NULL numeric
// columns legitimately hold 0 in legacy data, so they allow 0 (not 1); the two
// nullable columns (max net load/volume) carry no minimum and may be left empty.
const schema = z.object({
  vehicleTypeId: z.string().uuid('Tipe kendaraan wajib dipilih'),
  fuelId: z.string().uuid('Bahan bakar wajib dipilih'),
  brand: z.string().min(1, 'Merek wajib diisi').max(100, 'Merek maksimal 100 karakter'),
  fuelTankCapacity: z.coerce
    .number()
    .int('Kapasitas tangki harus bilangan bulat')
    .min(0, 'Kapasitas tangki tidak boleh negatif'),
  normalFuelRatio: z.coerce
    .number()
    .int('Rasio harus bilangan bulat')
    .min(0, 'Rasio tidak boleh negatif'),
  normalTareWeight: z.coerce
    .number()
    .int('Berat kosong harus bilangan bulat')
    .min(0, 'Berat kosong tidak boleh negatif'),
  maxNetLoad: z.coerce.number().int('Muatan harus bilangan bulat').optional(),
  maxNetVolume: z.coerce.number().int('Volume harus bilangan bulat').optional(),
  wheelCount: z.coerce
    .number()
    .int('Jumlah roda harus bilangan bulat')
    .min(0, 'Jumlah roda tidak boleh negatif'),
});
type Values = z.infer<typeof schema>;
const defaults: Values = {
  vehicleTypeId: '',
  fuelId: '',
  brand: '',
  fuelTankCapacity: 0,
  normalFuelRatio: 1,
  normalTareWeight: 0,
  maxNetLoad: undefined,
  maxNetVolume: undefined,
  wheelCount: 0,
};
const toForm = (r: VehicleModelDto): Values => ({
  vehicleTypeId: r.vehicleTypeId,
  fuelId: r.fuelId,
  brand: r.brand,
  fuelTankCapacity: r.fuelTankCapacity,
  normalFuelRatio: r.normalFuelRatio,
  normalTareWeight: r.normalTareWeight,
  maxNetLoad: r.maxNetLoad ?? undefined,
  maxNetVolume: r.maxNetVolume ?? undefined,
  wheelCount: r.wheelCount,
});
const appOption = (a: VehicleTypeDto): SelectOption => ({ value: a.id, label: a.name });
const fuelOption = (f: FuelDto): SelectOption => ({ value: f.id, label: f.name });

/** Vehicle Models (Model Kendaraan) — embedded tab of the combined vehicle page. */
export function VehicleModelsTab(): JSX.Element {
  const manager = useResourceManager(vehicleModelsApi, (r) => r.id);
  const { options: apps } = useOptions(vehicleTypesApi.list, appOption);
  const { options: fuels } = useOptions(fuelsApi.list, fuelOption);

  const columns = useMemo<ColumnDef<VehicleModelDto, unknown>[]>(
    () => [
      { accessorKey: 'brand', header: 'Merek/Model', meta: { label: 'Merek/Model' } },
      {
        accessorKey: 'vehicleTypeName',
        header: 'Tipe Kendaraan',
        meta: { label: 'Tipe Kendaraan' },
      },
      { accessorKey: 'fuelName', header: 'Bahan Bakar', meta: { label: 'Bahan Bakar' } },
      {
        accessorKey: 'wheelCount',
        header: 'Roda',
        meta: { label: 'Roda', filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.wheelCount}</span>,
      },
      {
        accessorKey: 'fuelTankCapacity',
        header: 'Kapasitas Tangki',
        meta: { label: 'Kapasitas Tangki', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.fuelTankCapacity} L</span>,
      },
      {
        accessorKey: 'normalTareWeight',
        header: 'Berat Kosong Normal',
        meta: { label: 'Berat Kosong Normal', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.normalTareWeight} kg</span>,
      },
      {
        accessorKey: 'normalFuelRatio',
        header: 'Rasio BBM Normal',
        meta: { label: 'Rasio BBM Normal', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.normalFuelRatio}</span>,
      },
      {
        accessorKey: 'maxNetLoad',
        header: 'Muatan Bersih Maks',
        meta: { label: 'Muatan Bersih Maks', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.maxNetLoad == null ? '—' : `${row.original.maxNetLoad} kg`}
          </span>
        ),
      },
      {
        accessorKey: 'maxNetVolume',
        header: 'Volume Bersih Maks',
        meta: { label: 'Volume Bersih Maks', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.maxNetVolume == null ? '—' : `${row.original.maxNetVolume} m³`}
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
              resource="vehicle-model"
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
      embedded
      title="Model Kendaraan"
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
        title={{ create: 'Tambah Model', edit: 'Ubah Model', view: 'Lihat Model' }}
      >
        <TextField name="brand" label="Merek/Model" required placeholder="Hino Dutro" />
        <div className="grid grid-cols-1 gap-4">
          <SelectField
            name="vehicleTypeId"
            label="Tipe Kendaraan"
            required
            options={apps}
            placeholder="Pilih tipe kendaraan"
          />
          <SelectField
            name="fuelId"
            label="Bahan Bakar"
            required
            options={fuels}
            placeholder="Pilih bahan bakar"
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <NumberField name="fuelTankCapacity" label="Kapasitas Tangki" required unit="L" min={0} />
          <NumberField name="wheelCount" label="Jumlah Roda" required min={0} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <NumberField
            name="normalTareWeight"
            label="Berat Kosong Normal"
            required
            unit="kg"
            min={0}
          />
          <NumberField name="normalFuelRatio" label="Rasio BBM Normal" required min={0} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <NumberField name="maxNetLoad" label="Muatan Bersih Maks" unit="kg" />
          <NumberField name="maxNetVolume" label="Volume Bersih Maks" unit="m³" />
        </div>
      </CrudFormDialog>
    </CrudListShell>
  );
}
