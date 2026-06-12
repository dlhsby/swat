'use client';

import { Plus } from 'lucide-react';
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
import { InspectionDialog } from '@/components/operations/inspection-dialog';
import { InspectionSheet } from '@/components/operations/inspection-sheet';
import {
  Button,
  ConfirmDialog,
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
import { formatDateDisplay, formatNumber } from '@/lib/format';
import { type VehicleDto } from '@/lib/master-api';
import { type InspectionDto, inspectionsApi } from '@/lib/operations-api';

const RESULT_OPTIONS = [
  { value: 'PASS', label: 'Lolos' },
  { value: 'ATTENTION', label: 'Perlu Perhatian' },
  { value: 'FAIL', label: 'Tidak Lolos' },
];

export interface VehicleInspectionsSheetProps {
  vehicle: VehicleDto | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Per-vehicle inspection history (Pemeriksaan Kendaraan). Opened as a row
 * sub-action of the Kendaraan tab, scoped to one vehicle via the `?vehicleId=`
 * list filter, then filtered by result/year and windowed client-side via the
 * shared sheet-list helpers. Reuses the standalone InspectionDialog / Sheet.
 */
export function VehicleInspectionsSheet({
  vehicle,
  onOpenChange,
}: VehicleInspectionsSheetProps): JSX.Element {
  const [rows, setRows] = useState<InspectionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultFilter, setResultFilter] = useState<string>(ALL_FILTER);
  const [yearFilter, setYearFilter] = useState<string>(ALL_FILTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionDto | null>(null);
  const [detail, setDetail] = useState<InspectionDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InspectionDto | null>(null);

  const vehicleId = vehicle?.id ?? null;

  const reload = useCallback(async (): Promise<void> => {
    if (vehicleId === null) {
      return;
    }
    setLoading(true);
    try {
      setRows(await inspectionsApi.list(`?vehicleId=${vehicleId}`));
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat pemeriksaan.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId !== null) {
      setResultFilter(ALL_FILTER);
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
          (resultFilter === ALL_FILTER || r.result === resultFilter) &&
          (yearFilter === ALL_FILTER || r.date.startsWith(yearFilter)),
      ),
    [rows, resultFilter, yearFilter],
  );

  const { windowed, remaining, loadMore } = useWindowedList(
    filtered,
    `${resultFilter}|${yearFilter}`,
  );

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

  return (
    <Sheet open={vehicle !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,520px)]">
        <SheetHeader>
          <SheetTitle>Pemeriksaan Kendaraan — {vehicle?.plateNumber}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <ProtectedAction permission="inspection:create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Periksa Kendaraan
            </Button>
          </ProtectedAction>

          {rows.length > 0 ? (
            <SheetFilterBar summary={`${formatNumber(filtered.length)} pemeriksaan`}>
              <FilterSelect
                value={resultFilter}
                onValueChange={setResultFilter}
                allLabel="Semua Hasil"
                options={RESULT_OPTIONS}
                className="h-9 w-[160px]"
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
              title={rows.length === 0 ? 'Belum ada pemeriksaan' : 'Tidak ada hasil'}
              description={
                rows.length === 0
                  ? 'Kendaraan ini belum pernah diperiksa.'
                  : 'Tidak ada pemeriksaan yang cocok dengan filter.'
              }
            />
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {windowed.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setDetail(row)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className="text-body-sm font-medium text-neutral-900">
                        {formatDateDisplay(row.date)}
                      </span>
                      <span className="text-tiny tabular-nums text-neutral-500">
                        {row.passedCount}/{row.totalCount} lolos
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <StatusPill domain="inspection" value={row.result} />
                      <RowActions
                        resource="inspection"
                        onView={() => setDetail(row)}
                        onEdit={() => openEdit(row)}
                        onDelete={() => setDeleteTarget(row)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <LoadMoreButton remaining={remaining} onClick={loadMore} />
            </div>
          )}
        </SheetBody>
      </SheetContent>

      <InspectionDialog
        open={dialogOpen}
        editing={editing}
        vehicleOptions={vehicle ? [{ value: vehicle.id, label: vehicle.plateNumber }] : []}
        lockedVehicleId={vehicle?.id}
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
    </Sheet>
  );
}
