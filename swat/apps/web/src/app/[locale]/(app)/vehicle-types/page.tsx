'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { z } from 'zod';

import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { TextField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { type VehicleTypeDto, vehicleTypesApi } from '@/lib/master-api';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
});
type Values = z.infer<typeof schema>;
const defaults: Values = { name: '' };
const toForm = (r: VehicleTypeDto): Values => ({ name: r.name });

export default function VehicleTypesPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(vehicleTypesApi, (r) => r.id);

  const columns = useMemo<ColumnDef<VehicleTypeDto, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Nama', meta: { label: 'Nama' } },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { label: 'Aksi' },
        cell: ({ row }) => (
          <div className="text-right">
            <RowActions
              resource="vehicle-type"
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
      title={t('vehicleTypes')}
      resource="vehicle-type"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari tipe kendaraan…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Tipe Kendaraan', edit: 'Ubah Tipe Kendaraan' }}
        className="max-w-[440px]"
      >
        <TextField name="name" label="Nama Tipe Kendaraan" required placeholder="Compactor" />
      </CrudFormDialog>
    </CrudListShell>
  );
}
