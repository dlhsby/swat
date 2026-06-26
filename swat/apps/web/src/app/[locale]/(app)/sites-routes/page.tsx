'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Spline } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
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
  DropdownMenuItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { useResourceManager } from '@/hooks/use-resource-manager';
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
    type: z.enum(['POOL', 'SPBU', 'TPS', 'TPA']),
    name: z.string().min(1, 'Nama lokasi wajib diisi').max(256),
    address: z.string().min(1, 'Alamat wajib diisi').max(512),
    latitude: z.coerce.number().min(-90, 'Lintang -90..90').max(90, 'Lintang -90..90').optional(),
    longitude: z.coerce
      .number()
      .min(-180, 'Bujur -180..180')
      .max(180, 'Bujur -180..180')
      .optional(),
  })
  .refine((d) => (d.latitude == null) === (d.longitude == null), {
    message: 'Lintang dan bujur harus diisi keduanya atau dikosongkan.',
    path: ['latitude'],
  });
type SiteValues = z.infer<typeof siteSchema>;
const siteDefaults: SiteValues = {
  type: 'TPS',
  name: '',
  address: '',
  latitude: undefined,
  longitude: undefined,
};
const siteToForm = (r: SiteDto): SiteValues => ({
  type: r.type,
  name: r.name,
  address: r.address,
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
  const lat = form.watch('latitude');
  const lng = form.watch('longitude');
  const value = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;

  const setPin = (p: { lat: number; lng: number }): void => {
    form.setValue('latitude', round6(p.lat), { shouldValidate: true, shouldDirty: true });
    form.setValue('longitude', round6(p.lng), { shouldValidate: true, shouldDirty: true });
  };
  const clearPin = (): void => {
    form.setValue('latitude', undefined, { shouldValidate: true, shouldDirty: true });
    form.setValue('longitude', undefined, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="space-y-2">
      <MapPicker value={value} onChange={setPin} />
      {value ? (
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
      { accessorKey: 'address', header: 'Alamat', meta: { label: 'Alamat' } },
      {
        accessorKey: 'latitude',
        header: 'Lintang',
        meta: { label: 'Lintang', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.latitude ?? '—'}</span>,
      },
      {
        accessorKey: 'longitude',
        header: 'Bujur',
        meta: { label: 'Bujur', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.longitude ?? '—'}</span>,
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
        title={{ create: 'Tambah Lokasi', edit: 'Ubah Lokasi' }}
        className="max-w-[520px]"
      >
        <SelectField name="type" label="Jenis Lokasi" required options={SITE_TYPES} />
        <TextField name="name" label="Nama" required />
        <TextareaField name="address" label="Alamat" required />
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

const routeSchema = z
  .object({
    category: z.enum(['DEPART_POOL', 'REFUEL', 'PICKUP', 'DISPOSAL', 'RETURN_POOL']),
    originSiteId: z.string().uuid('Lokasi asal wajib dipilih'),
    destinationSiteId: z.string().uuid('Lokasi tujuan wajib dipilih'),
    // 0 is allowed — legacy routes overwhelmingly carry distance 0.
    distanceKm: z.coerce
      .number()
      .int('Jarak harus bilangan bulat (km)')
      .min(0, 'Jarak tidak boleh negatif'),
  })
  // Pool-anchored legs (berangkat/kembali ke pool) may share origin & destination;
  // every other category must run between two distinct sites.
  .refine(
    (d) =>
      d.originSiteId !== d.destinationSiteId ||
      d.category === 'DEPART_POOL' ||
      d.category === 'RETURN_POOL',
    {
      message: 'Lokasi asal dan tujuan harus berbeda.',
      path: ['destinationSiteId'],
    },
  );
type RouteValues = z.infer<typeof routeSchema>;
const routeDefaults: RouteValues = {
  category: 'PICKUP',
  originSiteId: '',
  destinationSiteId: '',
  distanceKm: 0,
};
const routeToForm = (r: RouteDto): RouteValues => ({
  category: r.category,
  originSiteId: r.originSiteId,
  destinationSiteId: r.destinationSiteId,
  distanceKm: r.distanceKm,
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

/**
 * Origin/destination pickers that narrow to the site type required by the chosen
 * route category, and clear a selection that the new category no longer allows.
 */
function RouteSiteFields({ sites }: { sites: readonly SiteDto[] }): JSX.Element {
  const form = useFormContext<RouteValues>();
  const category = form.watch('category');
  const originSiteId = form.watch('originSiteId');
  const destinationSiteId = form.watch('destinationSiteId');
  const constraint = ROUTE_SITE_CONSTRAINTS[category];

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

  return (
    <div className="grid gap-4">
      <SelectField
        name="originSiteId"
        label="Asal"
        required
        options={originOptions}
        placeholder="Pilih lokasi"
        description={
          constraint.origin ? `Hanya lokasi ${siteTypeLabel(constraint.origin)}` : undefined
        }
      />
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
    </div>
  );
}

function RoutesTab(): JSX.Element {
  const manager = useResourceManager(routesApi, (r) => r.id);
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
      embedded
    >
      <CrudFormDialog
        manager={manager}
        schema={routeSchema}
        defaults={routeDefaults}
        toForm={routeToForm}
        title={{ create: 'Tambah Rute', edit: 'Ubah Rute' }}
        className="max-w-[520px]"
      >
        <SelectField name="category" label="Jenis Rute" required options={ROUTE_CATEGORIES} />
        <RouteSiteFields sites={sites} />
        <NumberField name="distanceKm" label="Jarak" required unit="km" min={0} />
      </CrudFormDialog>
      <RouteCorridorEditor route={corridorRoute} onClose={() => setCorridorRoute(null)} />
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
