'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { MapPin, Spline } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog, useCrudFormReadOnly } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import {
  NumberField,
  type SelectOption,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { MapPicker, round6 } from '@/components/maps/map-picker';
import { PageHead } from '@/components/shell/page-head';
import {
  type CorridorRoute,
  RouteCorridorEditor,
} from '@/components/tracking/route-corridor-editor';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenuItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { type ServerQueryParams } from '@/hooks/use-server-resource-list';
import { useServerResourceManager } from '@/hooks/use-server-resource-manager';
import { formatNumber } from '@/lib/format';
import {
  type RouteCategoryValue,
  type RouteDto,
  type SiteDto,
  type SiteType,
  routesApi,
  sitesApi,
} from '@/lib/master-api';

const SITE_TYPES: readonly SelectOption[] = [
  { value: 'POOL', label: 'Pool' },
  { value: 'SPBU', label: 'SPBU' },
  { value: 'TPS', label: 'TPS' },
  { value: 'TPA', label: 'TPA' },
];

const ROUTE_CATEGORIES: readonly SelectOption[] = [
  { value: 'DEPART_POOL', label: 'Berangkat Pool' },
  { value: 'REFUEL', label: 'Isi BBM' },
  { value: 'PICKUP', label: 'Ambil Sampah' },
  { value: 'DISPOSAL', label: 'Buang ke TPA' },
  { value: 'RETURN_POOL', label: 'Kembali Pool' },
];
const routeCategoryLabel = (c: RouteCategoryValue): string =>
  ROUTE_CATEGORIES.find((o) => o.value === c)?.label ?? c;
const siteTypeLabel = (t: SiteType): string => SITE_TYPES.find((o) => o.value === t)?.label ?? t;

/* ----------------------------- Sites tab ------------------------------ */

const siteSchema = z
  .object({
    // '' is the "not chosen yet" sentinel — no default jenis lokasi; refine forces a pick.
    type: z.enum(['POOL', 'SPBU', 'TPS', 'TPA']).or(z.literal('')),
    name: z.string().min(1, 'Nama lokasi wajib diisi').max(256),
    address: z.string().max(512, 'Alamat maksimal 512 karakter').optional(),
    latitude: z.coerce.number().min(-90, 'Lintang -90..90').max(90, 'Lintang -90..90').optional(),
    longitude: z.coerce
      .number()
      .min(-180, 'Bujur -180..180')
      .max(180, 'Bujur -180..180')
      .optional(),
  })
  .refine((d) => d.type !== '', { message: 'Jenis lokasi wajib dipilih', path: ['type'] })
  .refine((d) => (d.latitude == null) === (d.longitude == null), {
    message: 'Lintang dan bujur harus diisi keduanya atau dikosongkan.',
    path: ['latitude'],
  });
type SiteValues = z.infer<typeof siteSchema>;
const siteDefaults: SiteValues = {
  type: '',
  name: '',
  address: '',
  latitude: undefined,
  longitude: undefined,
};
const siteToForm = (r: SiteDto): SiteValues => ({
  type: r.type,
  name: r.name,
  address: r.address ?? '',
  latitude: r.latitude ?? undefined,
  longitude: r.longitude ?? undefined,
});

/**
 * Map pin bound to the form's `latitude`/`longitude` (rounded to 6dp to match the
 * DB precision). Dropping/dragging the pin or searching an address sets BOTH fields
 * together — honouring the both-or-neither rule — and the manual number inputs stay
 * editable as the source of truth. "Hapus titik" clears the pair.
 */
function SiteMapPicker(): JSX.Element {
  const form = useFormContext<SiteValues>();
  // In view ("Lihat") mode, show only the pin preview — no search, my-location,
  // click/drag, or "Hapus titik" (the disabled fieldset can't hide a button).
  const readOnly = useCrudFormReadOnly();
  const lat = form.watch('latitude');
  const lng = form.watch('longitude');
  const value = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;

  // Set BOTH fields, then validate ONCE. Validating on each setValue separately
  // races the async (zod) resolver: the lat-only pass can resolve last and leave a
  // stale "both-or-neither" error even though both are now set. So the first set
  // skips validation and the second triggers a single pass over the consistent pair.
  const setPin = (p: { lat: number; lng: number }): void => {
    form.setValue('latitude', round6(p.lat), { shouldDirty: true });
    form.setValue('longitude', round6(p.lng), { shouldValidate: true, shouldDirty: true });
  };
  const clearPin = (): void => {
    form.setValue('latitude', undefined, { shouldDirty: true });
    form.setValue('longitude', undefined, { shouldDirty: true });
    // Both cleared together is valid — drop any error the pair may have shown.
    form.clearErrors(['latitude', 'longitude']);
  };

  return (
    <div className="space-y-2">
      <MapPicker value={value} onChange={setPin} readOnly={readOnly} />
      {value && !readOnly ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-danger-600"
          onClick={clearPin}
        >
          Hapus titik
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Datagrid coordinate cell: shows `(lat, lng)` plus a pin button that opens a
 * read-only map preview of the point. Renders "—" when the site has no coordinates.
 */
function CoordinateCell({
  lat,
  lng,
  name,
}: {
  lat: number | null;
  lng: number | null;
  name: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  if (lat == null || lng == null) {
    return <span className="text-neutral-400">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="tabular-nums">
        ({lat}, {lng})
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Lihat di peta"
        title="Lihat di peta"
        className="text-primary-700 transition-colors hover:text-primary-800 dark:text-primary-400"
      >
        <MapPin className="h-4 w-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription className="tabular-nums">
              ({lat}, {lng})
            </DialogDescription>
          </DialogHeader>
          <MapPicker value={{ lat, lng }} onChange={() => undefined} readOnly height={320} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SitesTab(): JSX.Element {
  const manager = useResourceManager(sitesApi, (r) => r.id);
  const columns = useMemo<ColumnDef<SiteDto, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Nama', meta: { label: 'Nama' } },
      {
        accessorKey: 'type',
        header: 'Jenis',
        meta: { label: 'Jenis' },
        cell: ({ row }) => <Badge appearance="count">{siteTypeLabel(row.original.type)}</Badge>,
      },
      {
        accessorKey: 'address',
        header: 'Alamat',
        meta: { label: 'Alamat' },
        cell: ({ row }) => row.original.address ?? '—',
      },
      {
        id: 'coordinate',
        header: 'Koordinat',
        enableSorting: false,
        meta: { label: 'Koordinat' },
        cell: ({ row }) => (
          <CoordinateCell
            lat={row.original.latitude}
            lng={row.original.longitude}
            name={row.original.name}
          />
        ),
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
              resource="site"
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
      title=""
      resource="site"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari lokasi…"
      createLabel="Tambah Lokasi"
      embedded
    >
      <CrudFormDialog
        manager={manager}
        schema={siteSchema}
        defaults={siteDefaults}
        toForm={siteToForm}
        title={{ create: 'Tambah Lokasi', edit: 'Ubah Lokasi', view: 'Lihat Lokasi' }}
        className="max-w-[520px]"
      >
        <SelectField
          name="type"
          label="Jenis Lokasi"
          required
          options={SITE_TYPES}
          placeholder="Pilih jenis lokasi"
        />
        <TextField name="name" label="Nama" required />
        <TextareaField name="address" label="Alamat (opsional)" />
        <div className="grid grid-cols-2 gap-4">
          <NumberField name="latitude" label="Lintang (opsional)" />
          <NumberField name="longitude" label="Bujur (opsional)" />
        </div>
        <SiteMapPicker />
      </CrudFormDialog>
    </CrudListShell>
  );
}

/* ----------------------------- Routes tab ----------------------------- */

const ROUTE_CATEGORY_VALUES = [
  'DEPART_POOL',
  'REFUEL',
  'PICKUP',
  'DISPOSAL',
  'RETURN_POOL',
] as const;

const routeSchema = z
  .object({
    // '' is the "not chosen yet" sentinel — the form opens with no default jenis
    // rute; the first refine forces a real pick.
    category: z.enum(ROUTE_CATEGORY_VALUES).or(z.literal('')),
    originSiteId: z.string().uuid('Lokasi asal wajib dipilih'),
    // "Berangkat dari Pool" has no separate destination (it's the same pool) — the
    // field is hidden and resolved to the origin on submit; every other category
    // requires it (second refine).
    destinationSiteId: z.string().optional(),
  })
  .refine((d) => d.category !== '', { message: 'Jenis rute wajib dipilih', path: ['category'] })
  .refine((d) => d.category === 'DEPART_POOL' || Boolean(d.destinationSiteId), {
    message: 'Lokasi tujuan wajib dipilih',
    path: ['destinationSiteId'],
  })
  // Pool-anchored legs (berangkat/kembali ke pool) may share origin & destination;
  // every other category must run between two distinct sites.
  .refine(
    (d) =>
      d.category === 'DEPART_POOL' ||
      d.category === 'RETURN_POOL' ||
      d.originSiteId !== d.destinationSiteId,
    {
      message: 'Lokasi asal dan tujuan harus berbeda.',
      path: ['destinationSiteId'],
    },
  );
type RouteValues = z.infer<typeof routeSchema>;
const routeDefaults: RouteValues = {
  category: '',
  originSiteId: '',
  destinationSiteId: '',
};
const routeToForm = (r: RouteDto): RouteValues => ({
  category: r.category,
  originSiteId: r.originSiteId,
  destinationSiteId: r.destinationSiteId,
});
/**
 * Form values → request body. "Berangkat dari Pool" is recorded as a Pool→Pool
 * self-loop (destination = origin); `distanceKm` is omitted entirely — the backend
 * derives it from the route's default corridor length.
 */
const buildRoutePayload = (v: RouteValues): Record<string, unknown> => ({
  category: v.category,
  originSiteId: v.originSiteId,
  destinationSiteId: v.category === 'DEPART_POOL' ? v.originSiteId : v.destinationSiteId,
});
const siteOption = (s: SiteDto): SelectOption => ({ value: s.id, label: `${s.name} (${s.type})` });

/**
 * Per route category, which site TYPE the origin / destination must be. Mirrors
 * the legacy app's leg semantics: a "Berangkat dari Pool" leg starts at a Pool,
 * "Isi BBM" ends at an SPBU, "Ambil Sampah" ends at a TPS, "Buang ke TPA" ends at
 * a TPA, "Kembali ke Pool" ends at a Pool. An undefined end is unconstrained.
 */
const ROUTE_SITE_CONSTRAINTS: Record<
  RouteCategoryValue,
  { origin?: SiteType; destination?: SiteType }
> = {
  DEPART_POOL: { origin: 'POOL' },
  REFUEL: { destination: 'SPBU' },
  PICKUP: { destination: 'TPS' },
  DISPOSAL: { destination: 'TPA' },
  RETURN_POOL: { destination: 'POOL' },
};

const EMPTY_CONSTRAINT: { origin?: SiteType; destination?: SiteType } = {};

/**
 * Origin/destination pickers that narrow to the site type required by the chosen
 * route category, and clear a selection that the new category no longer allows.
 * Shown only after a category is picked; "Berangkat dari Pool" displays only the
 * Asal (it's a Pool→Pool kickoff, so there's no separate Tujuan).
 */
function RouteSiteFields({ sites }: { sites: readonly SiteDto[] }): JSX.Element | null {
  const form = useFormContext<RouteValues>();
  const category = form.watch('category');
  const originSiteId = form.watch('originSiteId');
  const destinationSiteId = form.watch('destinationSiteId');
  const constraint = category ? ROUTE_SITE_CONSTRAINTS[category] : EMPTY_CONSTRAINT;
  const isDepart = category === 'DEPART_POOL';

  // Drop a now-invalid selection whenever the category changes.
  useEffect(() => {
    if (originSiteId && constraint.origin) {
      const s = sites.find((x) => x.id === originSiteId);
      if (s && s.type !== constraint.origin) form.setValue('originSiteId', '');
    }
    if (destinationSiteId && constraint.destination) {
      const s = sites.find((x) => x.id === destinationSiteId);
      if (s && s.type !== constraint.destination) form.setValue('destinationSiteId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const originOptions = useMemo(
    () => sites.filter((s) => !constraint.origin || s.type === constraint.origin).map(siteOption),
    [sites, constraint.origin],
  );
  const destinationOptions = useMemo(
    () =>
      sites
        .filter((s) => !constraint.destination || s.type === constraint.destination)
        .map(siteOption),
    [sites, constraint.destination],
  );

  // Locations are chosen after the category (it constrains the allowed site types).
  if (!category) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <SelectField
        name="originSiteId"
        label={isDepart ? 'Lokasi Pool' : 'Asal'}
        required
        options={originOptions}
        placeholder="Pilih lokasi"
        description={
          constraint.origin ? `Hanya lokasi ${siteTypeLabel(constraint.origin)}` : undefined
        }
      />
      {!isDepart ? (
        <SelectField
          name="destinationSiteId"
          label="Tujuan"
          required
          options={destinationOptions}
          placeholder="Pilih lokasi"
          description={
            constraint.destination
              ? `Hanya lokasi ${siteTypeLabel(constraint.destination)}`
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function RoutesTab(): JSX.Element {
  // Routes run to ~17k legacy rows — page/search/filter on the server.
  const [category, setCategory] = useState<RouteCategoryValue | ''>('');
  const buildQuery = useCallback(
    ({ page, pageSize, search }: ServerQueryParams): string => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      return `?${params.toString()}`;
    },
    [category],
  );
  const manager = useServerResourceManager(routesApi, (r) => r.id, buildQuery);
  const { rows: sites } = useResourceList(sitesApi.list);
  const [corridorRoute, setCorridorRoute] = useState<CorridorRoute | null>(null);
  const columns = useMemo<ColumnDef<RouteDto, unknown>[]>(
    () => [
      {
        accessorKey: 'originSiteName',
        header: 'Lokasi Asal',
        meta: { label: 'Lokasi Asal' },
      },
      {
        accessorKey: 'destinationSiteName',
        header: 'Lokasi Tujuan',
        meta: { label: 'Lokasi Tujuan' },
      },
      {
        accessorKey: 'category',
        header: 'Jenis',
        meta: { label: 'Jenis' },
        cell: ({ row }) => (
          <Badge appearance="count">{routeCategoryLabel(row.original.category)}</Badge>
        ),
      },
      {
        accessorKey: 'distanceKm',
        header: 'Jarak',
        meta: { label: 'Jarak' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.distanceKm)} km</span>
        ),
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
              resource="route"
              onView={() => manager.openView(row.original)}
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                <ProtectedAction permission="route-geometry:manage">
                  <DropdownMenuItem onSelect={() => setCorridorRoute(row.original)}>
                    <Spline aria-hidden />
                    Koridor
                  </DropdownMenuItem>
                </ProtectedAction>
              }
            />
          </div>
        ),
      },
    ],
    [manager],
  );

  return (
    <CrudListShell
      title=""
      resource="route"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari rute…"
      createLabel="Tambah Rute"
      serverPagination={manager.serverPagination}
      toolbar={
        <Select
          value={category === '' ? 'ALL' : category}
          onValueChange={(v) => {
            setCategory(v === 'ALL' ? '' : (v as RouteCategoryValue));
            manager.setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-44" aria-label="Filter jenis rute">
            <SelectValue placeholder="Semua jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua jenis</SelectItem>
            {ROUTE_CATEGORIES.map((c) => (
              <SelectItem key={String(c.value)} value={String(c.value)}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      embedded
    >
      <CrudFormDialog
        manager={manager}
        schema={routeSchema}
        defaults={routeDefaults}
        toForm={routeToForm}
        buildPayload={buildRoutePayload}
        title={{ create: 'Tambah Rute', edit: 'Ubah Rute', view: 'Lihat Rute' }}
        className="max-w-[520px]"
      >
        <SelectField
          name="category"
          label="Jenis Rute"
          required
          options={ROUTE_CATEGORIES}
          placeholder="Pilih jenis rute"
        />
        <RouteSiteFields sites={sites} />
        {/* Jarak is derived from the route's default corridor (server-side) — not
            entered by hand. It still shows as a column in the grid. */}
      </CrudFormDialog>
      <RouteCorridorEditor
        route={corridorRoute}
        onClose={() => {
          setCorridorRoute(null);
          // A corridor edit may have resynced the route distance — refresh the grid.
          void manager.reload();
        }}
      />
    </CrudListShell>
  );
}

export default function SitesRoutesPage(): JSX.Element {
  const t = useTranslations('nav');
  return (
    <>
      <PageHead title={t('sitesRoutes')} />
      <Tabs defaultValue="sites">
        <TabsList>
          <TabsTrigger value="sites">Lokasi</TabsTrigger>
          <TabsTrigger value="routes">Rute</TabsTrigger>
        </TabsList>
        <TabsContent value="sites">
          <SitesTab />
        </TabsContent>
        <TabsContent value="routes">
          <RoutesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
