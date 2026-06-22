'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { hiddenIdColumn } from '@/components/crud/crud-list-shell';
import {
  Button,
  Card,
  CardContent,
  Combobox,
  type ComboboxOption,
  DataTable,
  Input,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusPill,
  TimePicker,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { combineDateTimeWIB, nowTimeWIB, todayWIB } from '@/lib/dates';
import { formatNumber, formatTime } from '@/lib/format';
import { type RouteDto, routesApi } from '@/lib/master-api';
import {
  type RecordTripInput,
  createTrip,
  getTransactionDayByDate,
  recordTrip,
} from '@/lib/transactions-api';
import { type RouteCategory, type TransactionDayDto, type TripDto } from '@/lib/types/transactions';

export interface QuickEntryBoardProps {
  /** Trip categories this tab records (e.g. ['DEPART_POOL','RETURN_POOL']). */
  readonly categories: readonly RouteCategory[];
}

type ActivityKind = 'PICKUP' | 'DISPOSAL' | 'REFUEL' | 'POOL';

function kindOf(categories: readonly RouteCategory[]): ActivityKind {
  if (categories.includes('REFUEL')) return 'REFUEL';
  if (categories.includes('DISPOSAL')) return 'DISPOSAL';
  if (categories.includes('PICKUP')) return 'PICKUP';
  return 'POOL';
}

/** One flattened trip row of the day, enriched with its vehicle + driver. */
interface ActivityRow extends TripDto {
  readonly vehiclePlate: string;
  readonly driverName: string;
}

const num = (v: number | null): string => (v != null && v > 0 ? formatNumber(v) : '—');
const clock = (v: string | null): string => (v ? formatTime(v) : '—');

/**
 * Legacy-style activity recording (transaksi/{pengisianbahanbakar,pembuangansampah,
 * pengambilansampah,aktivitaspool}): a focused entry form on top, and a recap
 * datagrid below of today's already-recorded (DONE/VERIFIED) trips of this kind.
 *
 * On submit the system mirrors the legacy flow: find the vehicle's scheduled
 * (IN_PROGRESS) trip of this category — by TPS for pickup/disposal, by pool leg
 * for pool, or any pending refuel — and record it; if none exists (and the kind
 * allows it) create an unscheduled trip for the typed location, then record. No
 * backend change: composes the existing record + create-trip endpoints.
 */
export function QuickEntryBoard({ categories }: QuickEntryBoardProps): JSX.Element {
  const kind = kindOf(categories);
  const canCreate = kind !== 'POOL'; // pool legs are never created off-plan
  const needsTps = kind === 'PICKUP' || kind === 'DISPOSAL';

  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state.
  const [vehicleId, setVehicleId] = useState('');
  const [poolDir, setPoolDir] = useState<RouteCategory>('DEPART_POOL');
  const [tps, setTps] = useState('');
  const [time, setTime] = useState(nowTimeWIB());
  const [odometer, setOdometer] = useState<number | ''>('');
  const [liters, setLiters] = useState<number | ''>('');
  const [gross, setGross] = useState<number | ''>('');
  const [tare, setTare] = useState<number | ''>('');
  const [volume, setVolume] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const [d, r] = await Promise.all([getTransactionDayByDate(todayWIB()), routesApi.list()]);
      setDay(d);
      setRoutes(r);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      (day?.hauls ?? [])
        .map((h) => ({ value: h.vehicleId, label: h.vehiclePlate }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [day],
  );

  // TPS suggestions: distinct origin sites of this category's routes.
  const tpsOptions = useMemo<ComboboxOption[]>(() => {
    const cat = kind === 'POOL' ? null : (kind as RouteCategory);
    const names = new Set(
      routes.filter((r) => cat === null || r.category === cat).map((r) => r.originSiteName),
    );
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [routes, kind]);

  const resetForm = (): void => {
    setTps('');
    setOdometer('');
    setLiters('');
    setGross('');
    setTare('');
    setVolume('');
    setNotes('');
    setTime(nowTimeWIB());
  };

  // Today's recorded trips of this kind (legacy grid shows DONE/VERIFIED only).
  const rows = useMemo<ActivityRow[]>(
    () =>
      (day?.hauls ?? [])
        .flatMap((haul) =>
          haul.assignments.flatMap((assignment) =>
            assignment.trips
              .filter(
                (t) =>
                  t.routeCategory !== null &&
                  categories.includes(t.routeCategory) &&
                  (t.status === 'DONE' || t.status === 'VERIFIED'),
              )
              .map((trip) => ({
                ...trip,
                vehiclePlate: haul.vehiclePlate,
                driverName: assignment.driverName,
              })),
          ),
        )
        .sort((a, b) => clock(b.actualTime).localeCompare(clock(a.actualTime))),
    [day, categories],
  );

  const columns = useMemo<ColumnDef<ActivityRow, unknown>[]>(() => {
    const extras: ColumnDef<ActivityRow, unknown>[] =
      kind === 'DISPOSAL'
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
                id: 'approved',
                header: 'BBM (L)',
                meta: { label: 'BBM (L)' },
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
        header: kind === 'POOL' ? 'Aktivitas' : 'Rute / Lokasi',
        meta: { label: 'Rute' },
        cell: ({ row }) => row.original.routeLabel ?? row.original.name,
      },
      {
        id: 'actual',
        header: 'Waktu',
        meta: { label: 'Waktu' },
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
    ];
  }, [kind]);

  const tripsOf = (vid: string): TripDto[] =>
    (day?.hauls ?? [])
      .filter((h) => h.vehicleId === vid)
      .flatMap((h) => h.assignments.flatMap((a) => a.trips));

  const findScheduled = (vid: string): TripDto | undefined => {
    const trips = tripsOf(vid).filter((t) => t.status === 'IN_PROGRESS');
    if (kind === 'REFUEL') return trips.find((t) => t.routeCategory === 'REFUEL');
    if (kind === 'POOL') return trips.find((t) => t.routeCategory === poolDir);
    // PICKUP / DISPOSAL — match by category + origin TPS.
    return trips.find(
      (t) => t.routeCategory === kind && routeById.get(t.routeId ?? '')?.originSiteName === tps,
    );
  };

  const buildActuals = (): RecordTripInput => {
    if (!day) throw new Error('no day');
    const payload: RecordTripInput = {
      actualTime: combineDateTimeWIB(day.date, time),
      actualOdometer: Number(odometer),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    if (kind === 'REFUEL' && liters !== '') {
      // Legacy captured the filled amount as approved; keep approved == requested
      // so a non-approver isn't blocked by the over-approval guard.
      payload.fuelRequestedLiters = Number(liters);
      payload.fuelApprovedLiters = Number(liters);
    }
    if (kind === 'DISPOSAL') {
      payload.grossWeight = Number(gross);
      if (tare !== '') payload.tareWeight = Number(tare);
      if (volume !== '') payload.wasteVolume = Number(volume);
    }
    return payload;
  };

  const valid =
    vehicleId !== '' &&
    time !== '' &&
    odometer !== '' &&
    (!needsTps || tps !== '') &&
    (kind !== 'REFUEL' || liters !== '') &&
    (kind !== 'DISPOSAL' || gross !== '');

  const onSubmit = async (): Promise<void> => {
    if (!valid || !day) return;
    setSaving(true);
    try {
      const actuals = buildActuals();
      const scheduled = findScheduled(vehicleId);
      if (scheduled) {
        await recordTrip(scheduled.id, actuals);
      } else if (canCreate) {
        const route =
          kind === 'REFUEL'
            ? routes.find((r) => r.category === 'REFUEL')
            : routes.find((r) => r.category === kind && r.originSiteName === tps);
        if (!route) {
          notify.error('Rute untuk lokasi ini tidak ditemukan.');
          return;
        }
        const haul = (day.hauls ?? []).find((h) => h.vehicleId === vehicleId);
        const assignmentId = haul?.assignments[0]?.id;
        if (!assignmentId) {
          notify.error('Kendaraan ini tidak memiliki penugasan hari ini.');
          return;
        }
        const created = await createTrip({ haulAssignmentId: assignmentId, routeId: route.id });
        await recordTrip(created.id, actuals);
      } else {
        notify.error('Tidak ada aktivitas terjadwal yang cocok untuk kendaraan ini.');
        return;
      }
      notify.success('Aktivitas berhasil dicatat.');
      resetForm();
      await load();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mencatat aktivitas.');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="space-y-5">
      <ProtectedAction permission="trip:update">
        <Card>
          <CardContent className="space-y-4">
            <div className="max-w-md space-y-4">
              <div className="space-y-1.5">
                <Label required>Kendaraan</Label>
                <Combobox
                  className="w-full"
                  options={vehicleOptions}
                  value={vehicleId}
                  onValueChange={setVehicleId}
                  placeholder="Pilih kendaraan"
                  searchPlaceholder="Cari nomor polisi…"
                  emptyText="Tidak ada kendaraan terjadwal hari ini"
                />
              </div>

              {kind === 'POOL' ? (
                <div className="space-y-1.5">
                  <Label required>Jenis Aktivitas</Label>
                  <Select value={poolDir} onValueChange={(v) => setPoolDir(v as RouteCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPART_POOL">Berangkat dari Pool</SelectItem>
                      <SelectItem value="RETURN_POOL">Kembali ke Pool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {needsTps ? (
                <div className="space-y-1.5">
                  <Label required>{kind === 'DISPOSAL' ? 'TPS Asal Sampah' : 'Lokasi TPS'}</Label>
                  <Combobox
                    className="w-full"
                    options={tpsOptions}
                    value={tps}
                    onValueChange={setTps}
                    placeholder="Pilih TPS"
                    searchPlaceholder="Cari TPS…"
                    emptyText="Tidak ada TPS"
                  />
                </div>
              ) : null}

              {kind === 'REFUEL' ? (
                <div className="space-y-1.5">
                  <Label required>Jumlah Isi BBM</Label>
                  <NumberInput
                    value={liters}
                    onValueChange={(v) => setLiters(Number.isNaN(v) ? '' : v)}
                    unit="L"
                    min={0}
                  />
                </div>
              ) : null}

              {kind === 'DISPOSAL' ? (
                <>
                  <div className="space-y-1.5">
                    <Label required>Berat Kotor</Label>
                    <NumberInput
                      value={gross}
                      onValueChange={(v) => setGross(Number.isNaN(v) ? '' : v)}
                      unit="kg"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Berat Kosong (tara)</Label>
                    <NumberInput
                      value={tare}
                      onValueChange={(v) => setTare(Number.isNaN(v) ? '' : v)}
                      unit="kg"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Volume</Label>
                    <NumberInput
                      value={volume}
                      onValueChange={(v) => setVolume(Number.isNaN(v) ? '' : v)}
                      unit="m³"
                      min={0}
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label required>Nominal Speedometer</Label>
                <NumberInput
                  value={odometer}
                  onValueChange={(v) => setOdometer(Number.isNaN(v) ? '' : v)}
                  unit="km"
                  min={0}
                />
              </div>

              <div className="space-y-1.5">
                <Label required>Waktu</Label>
                <TimePicker value={time} onValueChange={setTime} presets={false} />
              </div>

              {kind === 'REFUEL' || kind === 'DISPOSAL' ? (
                <div className="space-y-1.5">
                  <Label>Keterangan</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              ) : null}

              <Button onClick={() => void onSubmit()} loading={saving} disabled={!valid}>
                Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      </ProtectedAction>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Cari kendaraan / pengemudi / rute…"
        emptyTitle="Belum ada aktivitas tercatat hari ini."
        onRefresh={() => void load()}
        refreshing={loading}
      />
    </div>
  );
}
