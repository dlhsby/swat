'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { z } from 'zod';

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
import { PageHead } from '@/components/shell/page-head';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
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
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField name="latitude" label="Lintang (opsional)" />
          <NumberField name="longitude" label="Bujur (opsional)" />
        </div>
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
    distanceKm: z.coerce
      .number()
      .int('Jarak harus bilangan bulat (km)')
      .min(1, 'Jarak minimal 1 km'),
  })
  .refine((d) => d.originSiteId !== d.destinationSiteId, {
    message: 'Lokasi asal dan tujuan harus berbeda.',
    path: ['destinationSiteId'],
  });
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

function RoutesTab(): JSX.Element {
  const manager = useResourceManager(routesApi, (r) => r.id);
  const { options: sites } = useOptions(sitesApi.list, siteOption);
  const columns = useMemo<ColumnDef<RouteDto, unknown>[]>(
    () => [
      {
        id: 'route',
        header: 'Rute',
        meta: { label: 'Rute' },
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            {row.original.originSiteName}
            <ArrowRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            {row.original.destinationSiteName}
          </span>
        ),
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
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="originSiteId"
            label="Asal"
            required
            options={sites}
            placeholder="Pilih lokasi"
          />
          <SelectField
            name="destinationSiteId"
            label="Tujuan"
            required
            options={sites}
            placeholder="Pilih lokasi"
          />
        </div>
        <NumberField name="distanceKm" label="Jarak" required unit="km" min={1} />
      </CrudFormDialog>
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
