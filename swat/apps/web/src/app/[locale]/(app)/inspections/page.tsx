'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { type SelectOption } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { InspectionDialog } from '@/components/operations/inspection-dialog';
import { InspectionSheet } from '@/components/operations/inspection-sheet';
import { PageHead } from '@/components/shell/page-head';
import { Button, ConfirmDialog, DataTable, StatusPill, notify } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay } from '@/lib/format';
import { type VehicleDto, vehiclesApi } from '@/lib/master-api';
import { type InspectionDto, inspectionsApi } from '@/lib/operations-api';

const vehicleOption = (v: VehicleDto): SelectOption => ({ value: v.id, label: v.plateNumber });

export default function InspectionsPage(): JSX.Element {
  const t = useTranslations('nav');
  const { rows, loading, error, reload } = useResourceList(inspectionsApi.list);
  const { options: vehicles } = useOptions(vehiclesApi.list, vehicleOption);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionDto | null>(null);
  const [detail, setDetail] = useState<InspectionDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InspectionDto | null>(null);

  const openCreate = (): void => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (row: InspectionDto): void => {
    setEditing(row);
    setDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    try {
      await inspectionsApi.remove(deleteTarget.id);
      notify.success('Pemeriksaan dihapus.');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus pemeriksaan.');
    }
  };

  const createButton = (
    <ProtectedAction permission="inspection:create">
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4" aria-hidden />
        Periksa Kendaraan
      </Button>
    </ProtectedAction>
  );

  const columns = useMemo<ColumnDef<InspectionDto, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Tanggal',
        meta: { label: 'Tanggal' },
        cell: ({ row }) => formatDateDisplay(row.original.date),
      },
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => <span className="font-mono">{row.original.vehiclePlate}</span>,
      },
      { accessorKey: 'vehicleBrand', header: 'Model', meta: { label: 'Model' } },
      {
        accessorKey: 'inspectorName',
        header: 'Pemeriksa',
        meta: { label: 'Pemeriksa' },
        cell: ({ row }) => row.original.inspectorName ?? '—',
      },
      {
        id: 'passed',
        header: 'Lolos',
        enableSorting: false,
        meta: { label: 'Lolos' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.passedCount}/{row.original.totalCount}
          </span>
        ),
      },
      {
        accessorKey: 'result',
        header: 'Hasil',
        meta: { label: 'Hasil' },
        cell: ({ row }) => <StatusPill domain="inspection" value={row.original.result} />,
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
              resource="inspection"
              onView={() => setDetail(row.original)}
              onEdit={() => openEdit(row.original)}
              onDelete={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHead
        title={t('inspections')}
        description="Riwayat pemeriksaan kelaikan kendaraan."
        actions={createButton}
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari kendaraan…"
        emptyAction={createButton}
      />

      <InspectionDialog
        open={dialogOpen}
        editing={editing}
        vehicleOptions={vehicles}
        onOpenChange={setDialogOpen}
        onSaved={() => void reload()}
      />
      <InspectionSheet inspection={detail} onOpenChange={(open) => !open && setDetail(null)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus pemeriksaan?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
