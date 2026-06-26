'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { z } from 'zod';

import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { TextareaField, TextField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { type WasteSourceDto, wasteSourcesApi } from '@/lib/master-api';

const schema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(5, 'Kode maksimal 5 karakter'),
  name: z.string().min(1, 'Nama wajib diisi').max(128, 'Nama maksimal 128 karakter'),
  notes: z.string().max(1024).optional(),
});
type Values = z.infer<typeof schema>;
const defaults: Values = { code: '', name: '', notes: undefined };
const toForm = (r: WasteSourceDto): Values => ({
  code: r.code,
  name: r.name,
  notes: r.notes ?? undefined,
});

export default function WasteSourcesPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(wasteSourcesApi, (r) => r.id);

  const columns = useMemo<ColumnDef<WasteSourceDto, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Kode',
        meta: { label: 'Kode' },
        cell: ({ row }) => (
          <span className="rounded-sm bg-primary-50 px-1.5 py-0.5 font-mono text-tiny font-semibold text-primary-700">
            {row.original.code}
          </span>
        ),
      },
      { accessorKey: 'name', header: 'Nama', meta: { label: 'Nama' } },
      {
        accessorKey: 'notes',
        header: 'Catatan',
        meta: { label: 'Catatan' },
        cell: ({ row }) => <span className="text-neutral-500">{row.original.notes ?? '—'}</span>,
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
              resource="waste-source"
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
      title={t('wasteSources')}
      resource="waste-source"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari sumber sampah…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{
          create: 'Tambah Sumber Sampah',
          edit: 'Ubah Sumber Sampah',
          view: 'Lihat Sumber Sampah',
        }}
        className="max-w-[480px]"
      >
        <TextField name="code" label="Kode" required placeholder="TPS01" />
        <TextField name="name" label="Nama" required />
        <TextareaField name="notes" label="Catatan" placeholder="Opsional" />
      </CrudFormDialog>
    </CrudListShell>
  );
}
