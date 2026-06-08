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
import { type VehicleApplicationDto, vehicleApplicationsApi } from '@/lib/master-api';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
});
type Values = z.infer<typeof schema>;
const defaults: Values = { name: '' };
const toForm = (r: VehicleApplicationDto): Values => ({ name: r.name });

export default function VehicleApplicationsPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(vehicleApplicationsApi, (r) => r.id);

  const columns = useMemo<ColumnDef<VehicleApplicationDto, unknown>[]>(
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
              resource="vehicle-application"
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
      title={t('vehicleApplications')}
      resource="vehicle-application"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari aplikasi…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Aplikasi', edit: 'Ubah Aplikasi' }}
        className="max-w-[440px]"
      >
        <TextField name="name" label="Nama Aplikasi" required placeholder="Compactor" />
      </CrudFormDialog>
    </CrudListShell>
  );
}
