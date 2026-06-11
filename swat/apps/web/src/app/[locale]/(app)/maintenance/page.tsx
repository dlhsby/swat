'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, ClipboardList, Plus, Receipt, Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { type SelectOption } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { MaintenanceDialog } from '@/components/operations/maintenance-dialog';
import { PageHead } from '@/components/shell/page-head';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  DataTable,
  DropdownMenuItem,
  StatusPill,
  notify,
} from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatNumber, formatRupiah } from '@/lib/format';
import { type VehicleDto, vehiclesApi } from '@/lib/master-api';
import { type MaintenanceDto, approveMaintenance, maintenanceApi } from '@/lib/operations-api';

const vehicleOption = (v: VehicleDto): SelectOption => ({ value: v.id, label: v.plateNumber });

function Metric({
  icon: Icon,
  label,
  value,
  tone = 'bg-primary-50 text-primary-700',
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
  tone?: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-base ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-h2 font-bold tabular-nums text-neutral-900">{value}</p>
        <p className="text-label text-neutral-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function MaintenancePage(): JSX.Element {
  const t = useTranslations('nav');
  const { rows, loading, error, reload } = useResourceList(maintenanceApi.list);
  const { options: vehicles } = useOptions(vehiclesApi.list, vehicleOption);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceDto | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceDto | null>(null);
  const [approveTarget, setApproveTarget] = useState<MaintenanceDto | null>(null);

  const kpi = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const pending = rows.filter((r) => r.status === 'PENDING_APPROVAL').length;
    const approved = rows.filter((r) => r.status === 'APPROVED').length;
    const monthCost = rows
      .filter((r) => r.date.startsWith(month))
      .reduce((sum, r) => sum + r.totalCost, 0);
    return { total: rows.length, pending, approved, monthCost };
  }, [rows]);

  const openCreate = (): void => {
    setEditing(null);
    setReadOnly(false);
    setDialogOpen(true);
  };
  const openView = (row: MaintenanceDto): void => {
    setEditing(row);
    setReadOnly(true);
    setDialogOpen(true);
  };
  const openEdit = (row: MaintenanceDto): void => {
    setEditing(row);
    setReadOnly(false);
    setDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await maintenanceApi.remove(deleteTarget.id);
      notify.success('Perawatan dihapus.');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus perawatan.');
    }
  };

  const confirmApprove = async (): Promise<void> => {
    if (!approveTarget) return;
    try {
      await approveMaintenance(approveTarget.id);
      notify.success('Perawatan disetujui.');
      setApproveTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyetujui perawatan.');
    }
  };

  const createButton = (
    <ProtectedAction permission="maintenance:create">
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4" aria-hidden />
        Catat Perawatan
      </Button>
    </ProtectedAction>
  );

  const columns = useMemo<ColumnDef<MaintenanceDto, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Kode',
        meta: { label: 'Kode' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm">{row.original.code ?? '—'}</span>
        ),
      },
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
      {
        accessorKey: 'type',
        header: 'Jenis',
        meta: { label: 'Jenis' },
        cell: ({ row }) => <StatusPill domain="maintenanceType" value={row.original.type} />,
      },
      {
        accessorKey: 'description',
        header: 'Pekerjaan',
        meta: { label: 'Pekerjaan' },
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-[220px]">{row.original.description ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'totalCost',
        header: 'Biaya',
        meta: { label: 'Biaya' },
        cell: ({ row }) => formatRupiah(row.original.totalCost),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusPill domain="maintenance" value={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { label: 'Aksi' },
        cell: ({ row }) => {
          const pending = row.original.status === 'PENDING_APPROVAL';
          return (
            <div className="text-right">
              <RowActions
                resource="maintenance"
                onView={() => openView(row.original)}
                onEdit={pending ? () => openEdit(row.original) : undefined}
                onDelete={pending ? () => setDeleteTarget(row.original) : undefined}
                extra={
                  pending ? (
                    <ProtectedAction permission="maintenance:approve">
                      <DropdownMenuItem onSelect={() => setApproveTarget(row.original)}>
                        <CheckCircle2 aria-hidden />
                        Setujui
                      </DropdownMenuItem>
                    </ProtectedAction>
                  ) : null
                }
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <PageHead
        title={t('maintenance')}
        description="Riwayat servis & perbaikan kendaraan."
        actions={createButton}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={ClipboardList} label="Total Catatan" value={formatNumber(kpi.total)} />
        <Metric
          icon={Wrench}
          label="Belum Disetujui"
          value={formatNumber(kpi.pending)}
          tone="bg-warning-50 text-warning-700"
        />
        <Metric
          icon={CheckCircle2}
          label="Disetujui"
          value={formatNumber(kpi.approved)}
          tone="bg-success-50 text-success-700"
        />
        <Metric icon={Receipt} label="Biaya Bulan Ini" value={formatRupiah(kpi.monthCost)} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari kode / kendaraan…"
        emptyAction={createButton}
      />

      <MaintenanceDialog
        open={dialogOpen}
        editing={editing}
        readOnly={readOnly}
        vehicleOptions={vehicles}
        onOpenChange={setDialogOpen}
        onSaved={() => void reload()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus catatan perawatan?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Setujui perawatan?"
        description="Setelah disetujui, catatan tidak dapat diubah atau dihapus."
        confirmLabel="Setujui"
        onConfirm={() => void confirmApprove()}
      />
    </>
  );
}
