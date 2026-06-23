'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ChevronDown, Download, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { auditColumns, hiddenIdColumn } from '@/components/crud/crud-list-shell';
import { RowActions } from '@/components/crud/row-actions';
import { ActivityEditDialog } from '@/components/transactions/activity-edit-dialog';
import {
  Button,
  Card,
  CardContent,
  Combobox,
  type ComboboxOption,
  ConfirmDialog,
  DataTable,
  DateTimePicker,
  Input,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusPill,
  notify,
} from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/use-permissions';
import { type ExportColumn, exportActivity } from '@/lib/activity-export';
import { ApiError } from '@/lib/api-error';
import { combineDateTimeWIB, nowTimeWIB } from '@/lib/dates';
import { formatDateDisplay, formatNumber, formatTime } from '@/lib/format';
import { type RouteDto, type VehicleDto, routesApi, vehiclesApi } from '@/lib/master-api';
import {
  type RecordTripInput,
  createTrip,
  getTransactionDayByDate,
  recordTrip,
  unrecordTrip,
} from '@/lib/transactions-api';
import { type RouteCategory, type TransactionDayDto, type TripDto } from '@/lib/types/transactions';

export interface QuickEntryBoardProps {
  /** Trip categories this tab records (e.g. ['DEPART_POOL','RETURN_POOL']). */
  readonly categories: readonly RouteCategory[];
  /** The operation day (YYYY-MM-DD): drives the grid, the form, and the gate. */
  readonly date: string;
  /** Change the operation day (the form's datetime picker can move it). */
  readonly onDateChange: (date: string) => void;
}

type ActivityKind = 'PICKUP' | 'DISPOSAL' | 'REFUEL' | 'POOL';

function kindOf(categories: readonly RouteCategory[]): ActivityKind {
  if (categories.includes('REFUEL')) return 'REFUEL';
  if (categories.includes('DISPOSAL')) return 'DISPOSAL';
  if (categories.includes('PICKUP')) return 'PICKUP';
  return 'POOL';
}

/** Permission required to record (hence edit/delete) each kind, matching the
 *  server's category gate — so the form/actions only show where the user can
 *  actually submit (e.g. a Petugas TPA with only `trip:record-disposal`). */
const RECORD_PERMISSION: Record<ActivityKind, string> = {
  POOL: 'trip:update',
  PICKUP: 'trip:record-pickup',
  DISPOSAL: 'trip:record-disposal',
  REFUEL: 'trip:record-fuel',
};

/** One flattened trip row of the day, enriched with its vehicle + driver. */
interface ActivityRow extends TripDto {
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly driverName: string;
  /** Stable input-order number (rank by createdAt); persists across sort/filter. */
  readonly seq: number;
}

const num = (v: number | null): string => (v != null && v > 0 ? formatNumber(v) : '—');
const clock = (v: string | null): string => (v ? formatTime(v) : '—');

/** Human-readable activity type per route category. */
const CATEGORY_LABEL: Record<RouteCategory, string> = {
  DEPART_POOL: 'Berangkat dari Pool',
  RETURN_POOL: 'Kembali ke Pool',
  PICKUP: 'Pengambilan Sampah',
  DISPOSAL: 'Pembuangan Sampah',
  REFUEL: 'Pengisian BBM',
};

/** The single location the user entered for a trip (the route's relevant end). */
const tripLocation = (t: TripDto): string => {
  switch (t.routeCategory) {
    case 'DISPOSAL':
    case 'DEPART_POOL':
      return t.originSiteName ?? '';
    case 'PICKUP':
    case 'RETURN_POOL':
    case 'REFUEL':
      return t.destinationSiteName ?? '';
    default:
      return '';
  }
};

/** Waste-source code that gates BBM refuelling to government ("Dinas") vehicles. */
const DINAS_SOURCE_CODE = 'D';

/**
 * The TPS ("asal sampah") end of a route. Disposal routes run TPS → TPA, so the
 * TPS is the origin; pickup routes run hub → TPS, so the TPS is the destination.
 */
const tpsSiteName = (r: RouteDto, k: ActivityKind): string =>
  k === 'PICKUP' ? r.destinationSiteName : r.originSiteName;

/**
 * Legacy-faithful activity recording (transaksi/{pengisianbahanbakar,
 * pembuangansampah,pengambilansampah,aktivitaspool}): an entry form on top with
 * the same fields/rules as the legacy screen, and a recap grid below of today's
 * already-recorded (DONE/VERIFIED) trips of this kind.
 *
 * Save mirrors legacy: find the vehicle's scheduled (IN_PROGRESS) trip of this
 * kind — by TPS (pickup/disposal), by pool + leg (pool), or any pending refuel —
 * and record it; if none exists (and the kind allows it) create an unscheduled
 * trip for the typed location, then record. Net weight is computed server-side
 * (gross − tare). Frontend-only: composes record + create-trip endpoints.
 */
export function QuickEntryBoard({
  categories,
  date,
  onDateChange,
}: QuickEntryBoardProps): JSX.Element {
  const kind = kindOf(categories);
  const canCreate = kind !== 'POOL'; // pool legs are never created off-plan
  const needsTps = kind === 'PICKUP' || kind === 'DISPOSAL';
  const { can } = usePermissions();
  // Gates the inline form + per-row edit/delete; matches the server's category gate.
  const canManage = can(RECORD_PERMISSION[kind]);

  // One operation day (`date`, from the header): drives the recap grid, the form
  // (vehicle options + scheduled-trip lookup), and the not-initialized gate.
  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state. The realization datetime is `date` (operation day) + `time`.
  const [vehicleId, setVehicleId] = useState('');
  const [poolDir, setPoolDir] = useState<RouteCategory>('DEPART_POOL');
  const [location, setLocation] = useState(''); // TPS (pickup/disposal) or pool name
  const [time, setTime] = useState(nowTimeWIB());
  const [odometer, setOdometer] = useState<number | ''>('');
  const [liters, setLiters] = useState<number | ''>('');
  const [gross, setGross] = useState<number | ''>('');
  const [tare, setTare] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Per-row edit / delete (delete = soft un-record).
  const [editTrip, setEditTrip] = useState<ActivityRow | null>(null);
  const [deleteTrip, setDeleteTrip] = useState<ActivityRow | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setDay(await getTransactionDayByDate(date));
    } catch {
      setDay(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  // Routes & vehicles are date-independent master data — fetch once.
  useEffect(() => {
    void routesApi
      .list()
      .then(setRoutes)
      .catch(() => setRoutes([]));
    void vehiclesApi
      .list()
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, []);

  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  // Vehicle → waste-source codes, for the REFUEL "Dinas only" rule.
  const sourceCodesByVehicle = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v.wasteSourceCodes])),
    [vehicles],
  );
  // Vehicle master by id, for the BBM grid (type / model / fuel columns).
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  // POOL tab: once a pool is chosen, restrict the vehicle list to those with a
  // pending pool leg of the selected Jenis Aktivitas at that pool (pool legs are
  // never off-plan, so this is exactly the recordable set). `null` ⇒ no filter.
  const poolVehicleIds = useMemo<Set<string> | null>(() => {
    if (kind !== 'POOL' || !location) return null;
    const ids = new Set<string>();
    for (const haul of day?.hauls ?? []) {
      for (const assignment of haul.assignments) {
        for (const trip of assignment.trips) {
          if (trip.status !== 'IN_PROGRESS' || trip.routeCategory !== poolDir) continue;
          const route = routeById.get(trip.routeId ?? '');
          const poolName =
            poolDir === 'DEPART_POOL' ? route?.originSiteName : route?.destinationSiteName;
          if (poolName === location) ids.add(haul.vehicleId);
        }
      }
    }
    return ids;
  }, [day, kind, location, poolDir, routeById]);

  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      (day?.hauls ?? [])
        .filter((h) => !poolVehicleIds || poolVehicleIds.has(h.vehicleId))
        // REFUEL is restricted to Dinas vehicles (skip while master data still loads).
        .filter(
          (h) =>
            kind !== 'REFUEL' ||
            vehicles.length === 0 ||
            (sourceCodesByVehicle.get(h.vehicleId)?.includes(DINAS_SOURCE_CODE) ?? false),
        )
        .map((h) => ({ value: h.vehicleId, label: h.vehiclePlate }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [day, poolVehicleIds, kind, vehicles.length, sourceCodesByVehicle],
  );

  // Clear a selected vehicle that's no longer offered after the pool filter narrows.
  useEffect(() => {
    if (vehicleId && !vehicleOptions.some((o) => o.value === vehicleId)) {
      setVehicleId('');
    }
  }, [vehicleOptions, vehicleId]);

  // Location suggestions: TPS = origin sites of this category's routes; pool =
  // the pool end of the depart/return routes (origin for depart, dest for return).
  const locationOptions = useMemo<ComboboxOption[]>(() => {
    const names = new Set<string>();
    if (kind === 'PICKUP' || kind === 'DISPOSAL') {
      routes.filter((r) => r.category === kind).forEach((r) => names.add(tpsSiteName(r, kind)));
    } else if (kind === 'POOL') {
      routes
        .filter((r) => r.category === 'DEPART_POOL')
        .forEach((r) => names.add(r.originSiteName));
      routes
        .filter((r) => r.category === 'RETURN_POOL')
        .forEach((r) => names.add(r.destinationSiteName));
    }
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [routes, kind]);

  const net =
    kind === 'DISPOSAL' && gross !== '' && tare !== '' ? Number(gross) - Number(tare) : null;
  const grossInvalid =
    kind === 'DISPOSAL' && (gross === '' || tare === '' || (net !== null && net < 0));

  const resetForm = (): void => {
    setLocation('');
    setOdometer('');
    setLiters('');
    setGross('');
    setTare('');
    setNotes('');
    setTime(nowTimeWIB());
  };

  // Today's recorded trips of this kind (legacy grid shows DONE/VERIFIED only).
  const rows = useMemo<ActivityRow[]>(() => {
    const flat = (day?.hauls ?? []).flatMap((haul) =>
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
            vehicleId: haul.vehicleId,
            vehiclePlate: haul.vehiclePlate,
            driverName: assignment.driverName,
          })),
      ),
    );
    // Stable input-order numbering: legacy persisted a number so each location can
    // verify its own entries. We derive it from when the realization was entered
    // (`realizationEntryAt`, set on record) — falling back to `createdAt`, with a
    // UUID-v7 `id` tiebreak (v7 is itself time-ordered). It stays fixed to the
    // record when the user sorts/filters by any other column.
    const entryKey = (t: TripDto): string => t.realizationEntryAt ?? t.createdAt;
    return flat
      .sort((a, b) => entryKey(a).localeCompare(entryKey(b)) || a.id.localeCompare(b.id))
      .map((row, i) => ({ ...row, seq: i + 1 }));
  }, [day, categories]);

  const columns = useMemo<ColumnDef<ActivityRow, unknown>[]>(() => {
    // A plain text column keyed by its header (renders "—" when empty).
    const textCol = (
      header: string,
      value: (r: ActivityRow) => string,
    ): ColumnDef<ActivityRow, unknown> => ({
      id: header,
      accessorFn: value,
      header,
      meta: { label: header },
      cell: ({ getValue }) => (getValue() as string) || '—',
    });
    // A right-aligned numeric measure column.
    const measureCol = (
      key:
        | 'grossWeight'
        | 'tareWeight'
        | 'netWeight'
        | 'fuelRequestedLiters'
        | 'fuelApprovedLiters',
      header: string,
    ): ColumnDef<ActivityRow, unknown> => ({
      accessorKey: key,
      header,
      meta: { label: header, filterVariant: 'number' },
      cell: ({ row }) => <span className="tabular-nums">{num(row.original[key])}</span>,
    });

    // Kind-specific middle columns (legacy wording).
    const middle: ColumnDef<ActivityRow, unknown>[] =
      kind === 'POOL'
        ? [
            textCol('Aktivitas', (r) =>
              r.routeCategory ? CATEGORY_LABEL[r.routeCategory] : r.name,
            ),
            textCol('Lokasi Pool', tripLocation),
          ]
        : kind === 'REFUEL'
          ? [
              textCol('Tipe', (r) => vehicleById.get(r.vehicleId)?.vehicleTypeName ?? ''),
              textCol('Model', (r) => vehicleById.get(r.vehicleId)?.modelBrand ?? ''),
              textCol('Bahan Bakar', (r) => vehicleById.get(r.vehicleId)?.fuelTypeName ?? ''),
            ]
          : [textCol('TPS', tripLocation)];

    // Kind-specific measures (legacy wording).
    const measures: ColumnDef<ActivityRow, unknown>[] =
      kind === 'DISPOSAL'
        ? [
            measureCol('grossWeight', 'Berat Kotor'),
            measureCol('tareWeight', 'Berat Kosong'),
            measureCol('netWeight', 'Berat Bersih'),
            textCol('CCTV TPA', (r) => r.cctvReference ?? ''),
          ]
        : kind === 'REFUEL'
          ? [
              measureCol('fuelRequestedLiters', 'BBM Diajukan'),
              measureCol('fuelApprovedLiters', 'BBM Disetujui'),
            ]
          : [];

    // Odometer isn't read at the TPA → omit for disposal.
    const odometer: ColumnDef<ActivityRow, unknown>[] =
      kind === 'DISPOSAL'
        ? []
        : [
            {
              accessorKey: 'actualOdometer',
              header: 'Odometer',
              meta: { label: 'Odometer', filterVariant: 'number' },
              cell: ({ row }) => (
                <span className="tabular-nums">{num(row.original.actualOdometer)}</span>
              ),
            },
          ];

    const actions: ColumnDef<ActivityRow, unknown>[] = canManage
      ? [
          {
            id: 'actions',
            header: '',
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            meta: { pinRight: true, label: 'Aksi' },
            cell: ({ row }) => (
              <div className="text-right">
                <RowActions
                  resource="trip"
                  onEdit={() => setEditTrip(row.original)}
                  extra={
                    <DropdownMenuItem destructive onSelect={() => setDeleteTrip(row.original)}>
                      <Trash2 aria-hidden />
                      Hapus
                    </DropdownMenuItem>
                  }
                />
              </div>
            ),
          },
        ]
      : [];

    return [
      hiddenIdColumn<ActivityRow>(),
      {
        accessorKey: 'seq',
        header: 'No.',
        meta: { label: 'No.', filterVariant: 'number', pinLeft: true },
        cell: ({ row }) => (
          <span className="tabular-nums text-neutral-500">{row.original.seq}</span>
        ),
      },
      {
        accessorKey: 'vehiclePlate',
        header: 'Nopol',
        meta: { label: 'Nopol' },
        cell: ({ row }) => <span className="font-mono">{row.original.vehiclePlate}</span>,
      },
      { accessorKey: 'driverName', header: 'Pengemudi', meta: { label: 'Pengemudi' } },
      ...middle,
      {
        accessorKey: 'operationDate',
        header: 'Tanggal',
        meta: { label: 'Tanggal', filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDateDisplay(row.original.operationDate)}</span>
        ),
      },
      {
        id: 'time',
        accessorFn: (r) => r.actualTime ?? '',
        header: 'Waktu',
        meta: { label: 'Waktu' },
        cell: ({ row }) => <span className="tabular-nums">{clock(row.original.actualTime)}</span>,
      },
      ...odometer,
      ...measures,
      {
        accessorKey: 'notes',
        header: 'Keterangan',
        meta: { label: 'Keterangan' },
        cell: ({ row }) => row.original.notes ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        // Recap only lists DONE/VERIFIED trips, so status is redundant by default —
        // revealable via the column chooser.
        meta: { label: 'Status', defaultHidden: true },
        cell: ({ row }) => <StatusPill domain="trip" value={row.original.status} />,
      },
      ...actions,
      ...auditColumns<ActivityRow>(),
    ];
  }, [kind, canManage, vehicleById]);

  // ---- Direct report export (legacy laporan parity; renders & downloads inline). ----
  const reportTitle =
    kind === 'DISPOSAL'
      ? 'Laporan Hasil Entri Tonase'
      : kind === 'REFUEL'
        ? 'Laporan Hasil Entri Bahan Bakar'
        : kind === 'PICKUP'
          ? 'Laporan Pengambilan Sampah'
          : 'Laporan Aktivitas Pool';

  const exportColumns = useMemo<ExportColumn<ActivityRow>[]>(() => {
    const odo = (v: number): number | string => (v > 0 ? v : '');
    const head: ExportColumn<ActivityRow>[] = [
      { header: 'No.', value: (r) => r.seq, numeric: true },
      { header: 'Nopol', value: (r) => r.vehiclePlate },
      { header: 'Pengemudi', value: (r) => r.driverName },
    ];
    const middle: ExportColumn<ActivityRow>[] =
      kind === 'POOL'
        ? [
            {
              header: 'Aktivitas',
              value: (r) => (r.routeCategory ? CATEGORY_LABEL[r.routeCategory] : r.name),
            },
            { header: 'Lokasi Pool', value: tripLocation },
          ]
        : kind === 'REFUEL'
          ? [
              { header: 'Tipe', value: (r) => vehicleById.get(r.vehicleId)?.vehicleTypeName ?? '' },
              { header: 'Model', value: (r) => vehicleById.get(r.vehicleId)?.modelBrand ?? '' },
              {
                header: 'Bahan Bakar',
                value: (r) => vehicleById.get(r.vehicleId)?.fuelTypeName ?? '',
              },
            ]
          : [{ header: 'TPS', value: tripLocation }];
    const timing: ExportColumn<ActivityRow>[] = [
      { header: 'Tanggal', value: (r) => formatDateDisplay(r.operationDate) },
      { header: 'Waktu', value: (r) => (r.actualTime ? formatTime(r.actualTime) : '') },
    ];
    const odometer: ExportColumn<ActivityRow>[] =
      kind === 'DISPOSAL'
        ? []
        : [{ header: 'Odometer', value: (r) => odo(r.actualOdometer), numeric: true }];
    const measures: ExportColumn<ActivityRow>[] =
      kind === 'DISPOSAL'
        ? [
            { header: 'Berat Kotor', value: (r) => r.grossWeight ?? '', numeric: true },
            { header: 'Berat Kosong', value: (r) => r.tareWeight, numeric: true },
            { header: 'Berat Bersih', value: (r) => r.netWeight ?? '', numeric: true, total: true },
            { header: 'CCTV TPA', value: (r) => r.cctvReference ?? '' },
          ]
        : kind === 'REFUEL'
          ? [
              {
                header: 'BBM Diajukan',
                value: (r) => r.fuelRequestedLiters ?? '',
                numeric: true,
                total: true,
              },
              {
                header: 'BBM Disetujui',
                value: (r) => r.fuelApprovedLiters ?? '',
                numeric: true,
                total: true,
              },
            ]
          : [];
    return [
      ...head,
      ...middle,
      ...timing,
      ...odometer,
      ...measures,
      { header: 'Keterangan', value: (r) => r.notes ?? '' },
      { header: 'Status', value: (r) => r.status },
    ];
  }, [kind, vehicleById]);

  const onExport = async (format: 'xlsx' | 'pdf'): Promise<void> => {
    if (rows.length === 0) {
      notify.error('Tidak ada data untuk diekspor.');
      return;
    }
    try {
      await exportActivity(format, {
        title: reportTitle,
        subtitle: `Tanggal ${formatDateDisplay(date)}`,
        filename: `laporan_${kind.toLowerCase()}_${date}`,
        columns: exportColumns,
        rows,
      });
    } catch {
      notify.error('Gagal membuat laporan.');
    }
  };

  const pendingTrips = (vid: string): TripDto[] =>
    (day?.hauls ?? [])
      .filter((h) => h.vehicleId === vid)
      .flatMap((h) => h.assignments.flatMap((a) => a.trips))
      .filter((t) => t.status === 'IN_PROGRESS');

  const findScheduled = (vid: string): TripDto | undefined => {
    const trips = pendingTrips(vid);
    if (kind === 'REFUEL') return trips.find((t) => t.routeCategory === 'REFUEL');
    if (kind === 'POOL') {
      return trips.find((t) => {
        if (t.routeCategory !== poolDir) return false;
        const r = routeById.get(t.routeId ?? '');
        const poolName = poolDir === 'DEPART_POOL' ? r?.originSiteName : r?.destinationSiteName;
        return poolName === location;
      });
    }
    // PICKUP / DISPOSAL — match by category + the route's TPS end.
    return trips.find((t) => {
      if (t.routeCategory !== kind) return false;
      const r = routeById.get(t.routeId ?? '');
      return r ? tpsSiteName(r, kind) === location : false;
    });
  };

  const buildActuals = (): RecordTripInput => {
    const payload: RecordTripInput = {
      actualTime: combineDateTimeWIB(date, time),
      // Odometer is optional: the -1 sentinel skips the server-side chain check
      // (disposal never reads it at the TPA; other kinds may simply omit it).
      actualOdometer: kind === 'DISPOSAL' || odometer === '' ? -1 : Number(odometer),
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
      payload.tareWeight = Number(tare); // net = gross − tare is computed server-side
    }
    return payload;
  };

  const valid =
    vehicleId !== '' &&
    date !== '' &&
    time !== '' &&
    // Odometer is optional for every activity type.
    (kind !== 'POOL' || location !== '') &&
    (!needsTps || location !== '') &&
    (kind !== 'REFUEL' || liters !== '') &&
    (kind !== 'DISPOSAL' || !grossInvalid);

  const onSubmit = async (): Promise<void> => {
    if (!valid || !day) return;
    setSaving(true);
    try {
      const actuals = buildActuals();
      const scheduled = findScheduled(vehicleId);
      if (scheduled) {
        await recordTrip(scheduled.id, actuals);
      } else if (canCreate) {
        // Ad-hoc REFUEL: prefer the route departing the vehicle's own pool, else any.
        const refuelPool = vehicleById.get(vehicleId)?.poolSiteName;
        const route =
          kind === 'REFUEL'
            ? (routes.find((r) => r.category === 'REFUEL' && r.originSiteName === refuelPool) ??
              routes.find((r) => r.category === 'REFUEL'))
            : routes.find((r) => r.category === kind && tpsSiteName(r, kind) === location);
        if (!route) {
          notify.error('Rute untuk lokasi ini tidak ditemukan.');
          return;
        }
        const haul = (day.hauls ?? []).find((h) => h.vehicleId === vehicleId);
        const assignmentId = haul?.assignments[0]?.id;
        if (!assignmentId) {
          notify.error('Kendaraan ini tidak memiliki penugasan pada tanggal tersebut.');
          return;
        }
        const created = await createTrip({ haulAssignmentId: assignmentId, routeId: route.id });
        await recordTrip(created.id, actuals);
      } else {
        notify.error('Tidak ada aktivitas pool terjadwal yang cocok untuk kendaraan ini.');
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

  const onDelete = async (): Promise<void> => {
    if (!deleteTrip) return;
    try {
      await unrecordTrip(deleteTrip.id);
      notify.success('Catatan aktivitas dihapus.');
      setDeleteTrip(null);
      await load();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus catatan.');
    }
  };

  // The operation day (Rekap tanggal) isn't initialized → hide both form and grid.
  if (!loading && !day) {
    return (
      <Card>
        <CardContent className="space-y-2 py-10 text-center">
          <p className="text-body-sm text-neutral-700">
            Jadwal untuk tanggal ini belum diinisiasi.
          </p>
          <p className="text-tiny text-neutral-500">
            Pilih tanggal lain di “Rekap tanggal”, atau inisiasi hari di Penjadwalan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <ProtectedAction permission={RECORD_PERMISSION[kind]}>
        <Card>
          <CardContent>
            <div className="w-[28rem] max-w-full space-y-4">
              {/* Pool field order mirrors legacy: Jenis Aktivitas → Lokasi Pool → Kendaraan. */}
              {kind === 'POOL' ? (
                <>
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
                  <div className="space-y-1.5">
                    <Label required>Lokasi Pool</Label>
                    <Combobox
                      className="w-full"
                      limit={50}
                      options={locationOptions}
                      value={location}
                      onValueChange={setLocation}
                      placeholder="Pilih pool"
                      searchPlaceholder="Cari…"
                      emptyText="Tidak ada lokasi"
                    />
                  </div>
                </>
              ) : null}

              {/* Pool tab cascades: the vehicle list only appears once a pool is picked. */}
              {kind !== 'POOL' || location ? (
                <div className="space-y-1.5">
                  <Label required>Kendaraan</Label>
                  <Combobox
                    className="w-full"
                    limit={50}
                    options={vehicleOptions}
                    value={vehicleId}
                    onValueChange={setVehicleId}
                    placeholder="Pilih kendaraan"
                    searchPlaceholder="Cari nomor polisi…"
                    emptyText={
                      kind === 'POOL' && location
                        ? 'Tidak ada kendaraan untuk pool ini'
                        : 'Tidak ada kendaraan terjadwal pada tanggal ini'
                    }
                  />
                </div>
              ) : null}

              {needsTps ? (
                <div className="space-y-1.5">
                  <Label required>TPS Asal Sampah</Label>
                  <Combobox
                    className="w-full"
                    limit={50}
                    options={locationOptions}
                    value={location}
                    onValueChange={setLocation}
                    placeholder="Pilih TPS"
                    searchPlaceholder="Cari…"
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
                    <Label required>Berat Kosong Kendaraan</Label>
                    <NumberInput
                      value={tare}
                      onValueChange={(v) => setTare(Number.isNaN(v) ? '' : v)}
                      unit="kg"
                      min={0}
                    />
                  </div>
                  <div
                    className={`rounded-base border p-3 ${
                      net === null
                        ? 'border-neutral-200 bg-neutral-50'
                        : net >= 0
                          ? 'border-success-500 bg-success-50'
                          : 'border-danger-500 bg-danger-50'
                    }`}
                  >
                    <p className="text-label text-neutral-500">Berat Bersih (otomatis)</p>
                    <p
                      className={`text-h3 font-bold tabular-nums ${
                        net !== null && net < 0 ? 'text-danger-700' : 'text-success-700'
                      }`}
                    >
                      {net !== null ? `${formatNumber(net)} kg` : '—'}
                    </p>
                    {net !== null && net < 0 ? (
                      <p className="text-tiny text-danger-600">
                        Berat bersih tidak boleh negatif (berat kotor &lt; berat kosong).
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {/* Odometer isn't read at the TPA — omitted for disposal (sent as -1).
                  Optional for the other kinds too. */}
              {kind !== 'DISPOSAL' ? (
                <div className="space-y-1.5">
                  <Label>Odometer (opsional)</Label>
                  <NumberInput
                    value={odometer}
                    onValueChange={(v) => setOdometer(Number.isNaN(v) ? '' : v)}
                    unit="km"
                    min={0}
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label required>Waktu Realisasi</Label>
                <DateTimePicker
                  className="w-full"
                  disableFuture
                  value={`${date} ${time}`}
                  onValueChange={(v) => {
                    const [d, t] = v.split(' ');
                    if (d && d !== date) onDateChange(d);
                    if (t) setTime(t.slice(0, 5));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Keterangan</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opsional"
                />
              </div>

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
        emptyTitle="Belum ada aktivitas tercatat pada tanggal ini."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" aria-hidden />
                Ekspor Laporan
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void onExport('xlsx')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport('pdf')}>PDF (.pdf)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <ActivityEditDialog
        trip={editTrip}
        onOpenChange={(open) => !open && setEditTrip(null)}
        onSaved={() => void load()}
      />
      <ConfirmDialog
        open={deleteTrip !== null}
        onOpenChange={(open) => !open && setDeleteTrip(null)}
        title="Hapus catatan aktivitas?"
        description="Catatan realisasi akan dihapus dan aktivitas dikembalikan ke status belum dicatat — Anda dapat mencatatnya kembali."
        confirmLabel="Hapus"
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
