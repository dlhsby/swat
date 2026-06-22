'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { PlusCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { hiddenIdColumn } from '@/components/crud/crud-list-shell';
import { AddTripDialog } from '@/components/transactions/add-trip-dialog';
import { RecordTripDialog } from '@/components/transactions/record-trip-dialog';
import {
  Button,
  Card,
  CardContent,
  Combobox,
  type ComboboxOption,
  DataTable,
  StatusPill,
} from '@/components/ui';
import { todayWIB } from '@/lib/dates';
import { formatNumber, formatTime } from '@/lib/format';
import { getTransactionDayByDate } from '@/lib/transactions-api';
import { type RouteCategory, type TransactionDayDto, type TripDto } from '@/lib/types/transactions';

export interface QuickEntryBoardProps {
  /** Trip categories this tab records (e.g. ['DEPART_POOL','RETURN_POOL']). */
  readonly categories: readonly RouteCategory[];
  /** Offer "add ad-hoc trip" — off for pool legs (auto-created from the schedule). */
  readonly allowAdHoc?: boolean;
}

/** One flattened trip row of the day, enriched with its vehicle + driver. */
interface ActivityRow extends TripDto {
  readonly vehiclePlate: string;
  readonly driverName: string;
  readonly assignmentId: string;
}

type ActivityKind = 'PICKUP' | 'DISPOSAL' | 'REFUEL' | 'POOL';

function kindOf(categories: readonly RouteCategory[]): ActivityKind {
  if (categories.includes('REFUEL')) return 'REFUEL';
  if (categories.includes('DISPOSAL')) return 'DISPOSAL';
  if (categories.includes('PICKUP')) return 'PICKUP';
  return 'POOL';
}

const num = (v: number | null): string => (v != null && v > 0 ? formatNumber(v) : '—');
const clock = (v: string | null): string => (v ? formatTime(v) : '—');

/**
 * Per-day recap datagrid for one activity type (legacy parity for the
 * transaksi recap tables). Lists every matching-category trip of today across
 * the fleet so an operator/checker can review and record in place — pick "Catat"
 * on an in-progress row, or add an off-plan trip for a chosen vehicle. Reuses
 * {@link RecordTripDialog} / {@link AddTripDialog}; gated by `trip:update`
 * (record) / `trip:create` (ad-hoc add).
 */
export function QuickEntryBoard({
  categories,
  allowAdHoc = false,
}: QuickEntryBoardProps): JSX.Element {
  const kind = kindOf(categories);
  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recordTrip, setRecordTrip] = useState<TripDto | null>(null);
  const [adHocVehicleId, setAdHocVehicleId] = useState('');
  const [addAssignmentId, setAddAssignmentId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setDay(await getTransactionDayByDate(todayWIB()));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<ActivityRow[]>(
    () =>
      (day?.hauls ?? [])
        .flatMap((haul) =>
          haul.assignments.flatMap((assignment) =>
            assignment.trips
              .filter((t) => t.routeCategory !== null && categories.includes(t.routeCategory))
              .map((trip) => ({
                ...trip,
                vehiclePlate: haul.vehiclePlate,
                driverName: assignment.driverName,
                assignmentId: assignment.id,
              })),
          ),
        )
        .sort(
          (a, b) =>
            a.vehiclePlate.localeCompare(b.vehiclePlate) ||
            clock(a.targetTime).localeCompare(clock(b.targetTime)),
        ),
    [day, categories],
  );

  const onRecord = useCallback((trip: TripDto): void => setRecordTrip(trip), []);

  const columns = useMemo<ColumnDef<ActivityRow, unknown>[]>(() => {
    const extras: ColumnDef<ActivityRow, unknown>[] =
      kind === 'PICKUP'
        ? [
            {
              id: 'volume',
              header: 'Volume (m³)',
              meta: { label: 'Volume (m³)' },
              cell: ({ row }) => num(row.original.wasteVolume),
            },
          ]
        : kind === 'DISPOSAL'
          ? [
              {
                id: 'gross',
                header: 'Bruto (kg)',
                meta: { label: 'Bruto (kg)' },
                cell: ({ row }) => num(row.original.grossWeight),
              },
              {
                id: 'net',
                header: 'Netto (kg)',
                meta: { label: 'Netto (kg)' },
                cell: ({ row }) => num(row.original.netWeight),
              },
            ]
          : kind === 'REFUEL'
            ? [
                {
                  id: 'requested',
                  header: 'Diminta (L)',
                  meta: { label: 'Diminta (L)' },
                  cell: ({ row }) => num(row.original.fuelRequestedLiters),
                },
                {
                  id: 'approved',
                  header: 'Disetujui (L)',
                  meta: { label: 'Disetujui (L)' },
                  cell: ({ row }) => num(row.original.fuelApprovedLiters),
                },
              ]
            : [];

    return [
      hiddenIdColumn<ActivityRow>(),
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => <span className="font-mono">{row.original.vehiclePlate}</span>,
      },
      { accessorKey: 'driverName', header: 'Pengemudi', meta: { label: 'Pengemudi' } },
      {
        accessorKey: 'name',
        header: kind === 'POOL' ? 'Aktivitas' : 'Rute / Tujuan',
        meta: { label: 'Rute' },
        cell: ({ row }) => row.original.routeLabel ?? row.original.name,
      },
      {
        id: 'target',
        header: 'Target',
        meta: { label: 'Target' },
        cell: ({ row }) => <span className="tabular-nums">{clock(row.original.targetTime)}</span>,
      },
      {
        id: 'actual',
        header: 'Aktual',
        meta: { label: 'Aktual' },
        cell: ({ row }) => <span className="tabular-nums">{clock(row.original.actualTime)}</span>,
      },
      {
        id: 'odometer',
        header: 'Odometer',
        meta: { label: 'Odometer' },
        cell: ({ row }) => <span className="tabular-nums">{num(row.original.actualOdometer)}</span>,
      },
      ...extras,
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusPill domain="trip" value={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { label: 'Aksi' },
        cell: ({ row }) =>
          row.original.status === 'IN_PROGRESS' ? (
            <ProtectedAction permission="trip:update">
              <Button size="sm" onClick={() => onRecord(row.original)}>
                Catat
              </Button>
            </ProtectedAction>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
    ];
  }, [kind, onRecord]);

  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      (day?.hauls ?? [])
        .map((h) => ({ value: h.vehicleId, label: h.vehiclePlate }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [day],
  );

  const adHocAssignmentId =
    (day?.hauls ?? []).find((h) => h.vehicleId === adHocVehicleId)?.assignments[0]?.id ?? null;

  if (error || (!loading && !day)) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-body-sm text-neutral-500">
            Jadwal hari ini belum tersedia. Hubungi supervisor untuk membuat jadwal hari ini.
          </p>
          <Button variant="secondary" onClick={() => void load()}>
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Cari kendaraan / pengemudi / rute…"
        emptyTitle="Belum ada aktivitas untuk dicatat hari ini."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          allowAdHoc ? (
            <ProtectedAction permission="trip:create">
              <div className="flex items-center gap-2">
                <Combobox
                  className="w-44"
                  options={vehicleOptions}
                  value={adHocVehicleId}
                  onValueChange={setAdHocVehicleId}
                  placeholder="Kendaraan…"
                  searchPlaceholder="Cari nomor polisi…"
                  emptyText="Tidak ada kendaraan"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={adHocAssignmentId === null}
                  onClick={() => setAddAssignmentId(adHocAssignmentId)}
                >
                  <PlusCircle className="h-4 w-4" aria-hidden />
                  Tak terjadwal
                </Button>
              </div>
            </ProtectedAction>
          ) : undefined
        }
      />

      <RecordTripDialog
        trip={recordTrip}
        onOpenChange={(open) => !open && setRecordTrip(null)}
        onRecorded={() => void load()}
      />
      {allowAdHoc ? (
        <AddTripDialog
          haulAssignmentId={addAssignmentId}
          category={categories[0]}
          onOpenChange={(open) => !open && setAddAssignmentId(null)}
          onCreated={() => void load()}
        />
      ) : null}
    </>
  );
}
