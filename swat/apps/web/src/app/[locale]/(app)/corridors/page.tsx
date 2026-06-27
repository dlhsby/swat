'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { RowActions } from '@/components/crud/row-actions';
import { PageHead } from '@/components/shell/page-head';
import {
  type CorridorTarget,
  CorridorLibraryEditor,
} from '@/components/tracking/corridor-library-editor';
import { Badge, Button, ConfirmDialog, DataTable, notify } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { type CorridorDto, corridorsApi } from '@/lib/corridor-api';
import { formatNumber } from '@/lib/format';
import { type RouteCategoryValue, type SiteDto, sitesApi } from '@/lib/master-api';

const CATEGORY_LABEL: Record<RouteCategoryValue, string> = {
  DEPART_POOL: 'Berangkat Pool',
  REFUEL: 'Isi BBM',
  PICKUP: 'Ambil Sampah',
  DISPOSAL: 'Buang ke TPA',
  RETURN_POOL: 'Kembali Pool',
};

export default function CorridorsPage(): JSX.Element {
  const { rows, loading, error, reload } = useResourceList<CorridorDto>(corridorsApi.list);
  const { rows: sites } = useResourceList<SiteDto>(sitesApi.list);
  const [target, setTarget] = useState<CorridorTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<CorridorDto | null>(null);

  const columns = useMemo<ColumnDef<CorridorDto, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nama',
        meta: { label: 'Nama' },
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: 'leg',
        header: 'Ruas',
        meta: { label: 'Ruas' },
        cell: ({ row }) =>
          row.original.originSiteName || row.original.destinationSiteName ? (
            <span className="text-body-sm text-neutral-600">
              {row.original.originSiteName ?? '—'} → {row.original.destinationSiteName ?? '—'}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
      {
        accessorKey: 'category',
        header: 'Jenis',
        meta: { label: 'Jenis' },
        cell: ({ row }) =>
          row.original.category ? (
            <Badge appearance="count">{CATEGORY_LABEL[row.original.category]}</Badge>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
      {
        accessorKey: 'lengthMeters',
        header: 'Panjang',
        meta: { label: 'Panjang' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(Math.round(row.original.lengthMeters / 100) / 10)} km
          </span>
        ),
      },
      {
        accessorKey: 'toleranceMeters',
        header: 'Toleransi',
        meta: { label: 'Toleransi' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.toleranceMeters} m</span>,
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
              resource="corridor"
              onEdit={() => setTarget(row.original)}
              onDelete={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const createButton = (
    <ProtectedAction permission="corridor:create">
      <Button onClick={() => setTarget('new')}>Tambah Koridor</Button>
    </ProtectedAction>
  );

  const onConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await corridorsApi.remove(deleteTarget.id);
      notify.success('Koridor dihapus.');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus koridor.');
    }
  };

  return (
    <>
      <PageHead title="Koridor" actions={createButton} />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari koridor…"
        emptyAction={createButton}
      />

      <CorridorLibraryEditor
        target={target}
        sites={sites}
        onClose={() => setTarget(null)}
        onSaved={() => void reload()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus koridor ini?"
        description="Templat dan trip yang memakainya akan kehilangan koridor ini."
        confirmLabel="Hapus"
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  );
}
