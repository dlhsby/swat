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
import { formatRupiah } from '@/lib/format';
import { type FuelCategoryDto, type FuelDto, fuelCategoriesApi, fuelsApi } from '@/lib/master-api';

const schema = z.object({
  fuelCategoryId: z.string().uuid('Kategori bahan bakar wajib dipilih'),
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  pricePerLiter: z.coerce
    .number()
    .int('Harga harus bilangan bulat')
    .min(0, 'Harga tidak boleh negatif'),
});
type Values = z.infer<typeof schema>;
const defaults: Values = { fuelCategoryId: '', name: '', pricePerLiter: 0 };
const toForm = (r: FuelDto): Values => ({
  fuelCategoryId: r.fuelCategoryId,
  name: r.name,
  pricePerLiter: r.pricePerLiter,
});
const categoryOption = (c: FuelCategoryDto): SelectOption => ({ value: c.id, label: c.name });

/** Fuels (Bahan Bakar) — embedded tab of the combined vehicle page. */
export function FuelsTab(): JSX.Element {
  const manager = useResourceManager(fuelsApi, (r) => r.id);
  const { options: categories } = useOptions(fuelCategoriesApi.list, categoryOption);

  const columns = useMemo<ColumnDef<FuelDto, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Nama', meta: { label: 'Nama' } },
      { accessorKey: 'fuelCategoryName', header: 'Kategori', meta: { label: 'Kategori' } },
      {
        accessorKey: 'pricePerLiter',
        header: 'Harga / L',
        meta: { label: 'Harga / L' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRupiah(row.original.pricePerLiter)}</span>
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
              resource="fuel"
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
      title="Bahan Bakar"
      resource="fuel"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari bahan bakar…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Bahan Bakar', edit: 'Ubah Bahan Bakar' }}
        className="max-w-[480px]"
      >
        <TextField name="name" label="Nama" required placeholder="Pertalite" />
        <SelectField
          name="fuelCategoryId"
          label="Kategori"
          required
          options={categories}
          placeholder="Pilih kategori"
        />
        <NumberField name="pricePerLiter" label="Harga per Liter" required unit="Rp" min={0} />
      </CrudFormDialog>
    </CrudListShell>
  );
}
