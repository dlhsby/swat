'use client';

import { CheckCircle2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { RowActions } from '@/components/crud/row-actions';
import {
  ALL_FILTER,
  FilterSelect,
  LoadMoreButton,
  SheetFilterBar,
  useWindowedList,
} from '@/components/crud/sheet-list';
import { MaintenanceDialog } from '@/components/operations/maintenance-dialog';
import {
  Button,
  ConfirmDialog,
  DropdownMenuItem,
  EmptyState,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusPill,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { formatDateDisplay, formatNumber, formatRupiah } from '@/lib/format';
import { type VehicleDto } from '@/lib/master-api';
import { type MaintenanceDto, approveMaintenance, maintenanceApi } from '@/lib/operations-api';

const STATUS_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Belum Disetujui' },
  { value: 'APPROVED', label: 'Disetujui' },
];
const TYPE_OPTIONS = [
  { value: 'SERVICE', label: 'Servis' },
  { value: 'REPAIR', label: 'Perbaikan' },
];

export interface VehicleMaintenanceSheetProps {
  vehicle: VehicleDto | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Per-vehicle maintenance history (Perawatan Kendaraan). Opened as a row
 * sub-action of the Kendaraan tab, scoped to one vehicle via the `?vehicleId=`
 * list filter, then filtered by status/type/year and windowed client-side via
 * the shared sheet-list helpers. Approval happens here (the global approval
 * queue moved into this per-vehicle view).
 */
export function VehicleMaintenanceSheet({
  vehicle,
  onOpenChange,
}: VehicleMaintenanceSheetProps): JSX.Element {
  const [rows, setRows] = useState<MaintenanceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER);
  const [typeFilter, setTypeFilter] = useState<string>(ALL_FILTER);
  const [yearFilter, setYearFilter] = useState<string>(ALL_FILTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceDto | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceDto | null>(null);
  const [approveTarget, setApproveTarget] = useState<MaintenanceDto | null>(null);

  const vehicleId = vehicle?.id ?? null;

  const reload = useCallback(async (): Promise<void> => {
    if (vehicleId === null) {
      return;
    }
    setLoading(true);
    try {
      setRows(await maintenanceApi.list(`?vehicleId=${vehicleId}`));
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat perawatan.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId !== null) {
      setStatusFilter(ALL_FILTER);
      setTypeFilter(ALL_FILTER);
      setYearFilter(ALL_FILTER);
      void reload();
    }
  }, [vehicleId, reload]);

  const years = useMemo(() => {
    const set = new Set(rows.map((r) => r.date.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a)).map((y) => ({ value: y, label: y }));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (statusFilter === ALL_FILTER || r.status === statusFilter) &&
          (typeFilter === ALL_FILTER || r.type === typeFilter) &&
          (yearFilter === ALL_FILTER || r.date.startsWith(yearFilter)),
      ),
    [rows, statusFilter, typeFilter, yearFilter],
  );

  const totalCost = useMemo(() => filtered.reduce((sum, r) => sum + r.totalCost, 0), [filtered]);

  const { windowed, remaining, loadMore } = useWindowedList(
    filtered,
    `${statusFilter}|${typeFilter}|${yearFilter}`,
  );

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
    if (!deleteTarget) {
      return;
    }
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
    if (!approveTarget) {
      return;
    }
    try {
      await approveMaintenance(approveTarget.id);
      notify.success('Perawatan disetujui.');
      setApproveTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyetujui perawatan.');
    }
  };

  return (
    <Sheet open={vehicle !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,560px)]">
        <SheetHeader>
          <SheetTitle>Perawatan Kendaraan — {vehicle?.plateNumber}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <ProtectedAction permission="maintenance:create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Catat Perawatan
            </Button>
          </ProtectedAction>

          {rows.length > 0 ? (
            <SheetFilterBar
              summary={`${formatNumber(filtered.length)} catatan · ${formatRupiah(totalCost)}`}
            >
              <FilterSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                allLabel="Semua Status"
                options={STATUS_OPTIONS}
              />
              <FilterSelect
                value={typeFilter}
                onValueChange={setTypeFilter}
                allLabel="Semua Jenis"
                options={TYPE_OPTIONS}
                className="h-9 w-[130px]"
              />
              <FilterSelect
                value={yearFilter}
                onValueChange={setYearFilter}
                allLabel="Semua Tahun"
                options={years}
                className="h-9 w-[120px]"
              />
            </SheetFilterBar>
          ) : null}

          {loading ? (
            <Skeleton className="h-24" />
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration="no-results"
              title={rows.length === 0 ? 'Belum ada catatan perawatan' : 'Tidak ada hasil'}
              description={
                rows.length === 0
                  ? 'Kendaraan ini belum memiliki catatan servis atau perbaikan.'
                  : 'Tidak ada catatan yang cocok dengan filter.'
              }
            />
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {windowed.map((row) => {
                  const pending = row.status === 'PENDING_APPROVAL';
                  return (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => openView(row)}
                        className="flex flex-1 flex-col items-start gap-0.5 text-left"
                      >
                        <span className="flex items-center gap-2 text-body-sm font-medium text-neutral-900">
                          <span className="font-mono text-tiny">{row.code ?? '—'}</span>
                          {formatDateDisplay(row.date)}
                        </span>
                        <span className="flex items-center gap-2 text-tiny text-neutral-500">
                          <StatusPill domain="maintenanceType" value={row.type} />
                          {formatRupiah(row.totalCost)}
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <StatusPill domain="maintenance" value={row.status} />
                        <RowActions
                          resource="maintenance"
                          onView={() => openView(row)}
                          onEdit={pending ? () => openEdit(row) : undefined}
                          onDelete={pending ? () => setDeleteTarget(row) : undefined}
                          extra={
                            pending ? (
                              <ProtectedAction permission="maintenance:approve">
                                <DropdownMenuItem onSelect={() => setApproveTarget(row)}>
                                  <CheckCircle2 aria-hidden />
                                  Setujui
                                </DropdownMenuItem>
                              </ProtectedAction>
                            ) : null
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <LoadMoreButton remaining={remaining} onClick={loadMore} />
            </div>
          )}
        </SheetBody>
      </SheetContent>

      <MaintenanceDialog
        open={dialogOpen}
        editing={editing}
        readOnly={readOnly}
        vehicleOptions={vehicle ? [{ value: vehicle.id, label: vehicle.plateNumber }] : []}
        lockedVehicleId={vehicle?.id}
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
    </Sheet>
  );
}
