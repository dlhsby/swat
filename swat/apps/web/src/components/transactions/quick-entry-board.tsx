'use client';

import { PlusCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { AddTripDialog } from '@/components/transactions/add-trip-dialog';
import { RecordTripDialog } from '@/components/transactions/record-trip-dialog';
import {
  Button,
  Card,
  CardContent,
  Combobox,
  type ComboboxOption,
  Skeleton,
  StatusPill,
} from '@/components/ui';
import { todayWIB } from '@/lib/dates';
import { formatTime } from '@/lib/format';
import { getTransactionDayByDate } from '@/lib/transactions-api';
import {
  type HaulAssignmentDto,
  type RouteCategory,
  type TransactionDayDto,
  type TripDto,
} from '@/lib/types/transactions';

export interface QuickEntryBoardProps {
  /** Trip categories this focused screen records (e.g. ['DEPART_POOL','RETURN_POOL']). */
  readonly categories: readonly RouteCategory[];
  /** Offer "add ad-hoc trip" — off for pool legs (auto-created from the schedule). */
  readonly allowAdHoc?: boolean;
}

interface CategoryTrip {
  readonly trip: TripDto;
  readonly assignment: HaulAssignmentDto;
}

/**
 * Role-focused single-task recording screen (legacy parity for the per-role
 * transaksi menus: pengambilansampah / pembuangansampah / aktivitaspool /
 * pengisianbahanbakar). Pick today's vehicle, then record just this activity —
 * no day → haul → trip navigation. Reuses {@link RecordTripDialog} and
 * {@link AddTripDialog}; gated by `trip:update` (record) / `trip:create` (add).
 */
export function QuickEntryBoard({
  categories,
  allowAdHoc = false,
}: QuickEntryBoardProps): JSX.Element {
  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [recordTrip, setRecordTrip] = useState<TripDto | null>(null);
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

  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      (day?.hauls ?? [])
        .map((h) => ({ value: h.vehicleId, label: h.vehiclePlate }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [day],
  );

  const selectedHaul = (day?.hauls ?? []).find((h) => h.vehicleId === vehicleId) ?? null;

  const entries = useMemo<CategoryTrip[]>(
    () =>
      (selectedHaul?.assignments ?? []).flatMap((assignment) =>
        assignment.trips
          .filter((t) => t.routeCategory !== null && categories.includes(t.routeCategory))
          .map((trip) => ({ trip, assignment })),
      ),
    [selectedHaul, categories],
  );

  const firstAssignmentId = selectedHaul?.assignments[0]?.id ?? null;

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <>
      {error || !day ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-body-sm text-neutral-500">
              Hari transaksi hari ini belum tersedia. Hubungi supervisor untuk menginisialisasi hari
              transaksi.
            </p>
            <Button variant="secondary" onClick={() => void load()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-label text-neutral-700" htmlFor="qe-vehicle">
              Kendaraan
            </label>
            <Combobox
              options={vehicleOptions}
              value={vehicleId}
              onValueChange={setVehicleId}
              placeholder="Pilih kendaraan"
              searchPlaceholder="Cari nomor polisi…"
              emptyText="Tidak ada kendaraan terjadwal hari ini"
              className="w-72 max-w-full"
            />
          </div>

          {vehicleId === '' ? (
            <Card>
              <CardContent className="py-8 text-center text-body-sm text-neutral-500">
                Pilih kendaraan untuk mulai mencatat.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {entries.map(({ trip }) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-0 px-[18px] py-4"
                >
                  <div>
                    <div className="font-medium text-neutral-900">{trip.name}</div>
                    <div className="mt-0.5 text-[12px] text-neutral-500">
                      {trip.actualTime
                        ? `Aktual ${formatTime(trip.actualTime)}`
                        : trip.targetTime
                          ? `Target ${formatTime(trip.targetTime)}`
                          : 'Belum dijadwalkan'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill domain="trip" value={trip.status} />
                    {trip.status === 'IN_PROGRESS' ? (
                      <ProtectedAction permission="trip:update">
                        <Button size="sm" onClick={() => setRecordTrip(trip)}>
                          Catat
                        </Button>
                      </ProtectedAction>
                    ) : null}
                  </div>
                </div>
              ))}

              {entries.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-body-sm text-neutral-500">
                    Tidak ada aktivitas untuk dicatat pada kendaraan ini.
                  </CardContent>
                </Card>
              ) : null}

              {allowAdHoc && firstAssignmentId ? (
                <ProtectedAction permission="trip:create">
                  <Button variant="outline" onClick={() => setAddAssignmentId(firstAssignmentId)}>
                    <PlusCircle className="h-4 w-4" aria-hidden />
                    Tambah aktivitas tak terjadwal
                  </Button>
                </ProtectedAction>
              ) : null}
            </div>
          )}
        </div>
      )}

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
