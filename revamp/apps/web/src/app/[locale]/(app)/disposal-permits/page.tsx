'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { DateField, type SelectOption, SelectField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { KitirBulkImportDialog } from '@/components/scheduling/kitir-bulk-import-dialog';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusPill,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { type ServerQueryParams } from '@/hooks/use-server-resource-list';
import { useServerResourceManager } from '@/hooks/use-server-resource-manager';
import { formatDateDisplay } from '@/lib/format';
import {
  type DisposalPermitDto,
  type SiteDto,
  type VehicleDto,
  disposalPermitsApi,
  sitesApi,
  vehiclesApi,
} from '@/lib/master-api';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'ACTIVE', label: 'Berlaku' },
  { value: 'INACTIVE', label: 'Tidak Berlaku' },
];

const schema = z
  .object({
    vehicleId: z.string().uuid('Kendaraan wajib dipilih'),
    siteId: z.string().uuid('Lokasi wajib dipilih'),
    issuedAt: z.string().min(1, 'Tanggal terbit wajib diisi'),
    validFrom: z.string().min(1, 'Berlaku dari wajib diisi'),
    validTo: z.string().min(1, 'Berlaku sampai wajib diisi'),
    // '' is the "not chosen yet" sentinel — no default; refine forces a pick.
    status: z.enum(['ACTIVE', 'INACTIVE']).or(z.literal('')),
  })
  .refine((d) => d.status !== '', { message: 'Status wajib dipilih', path: ['status'] })
  .refine((d) => d.validFrom <= d.validTo, {
    message: 'Berlaku sampai harus setelah berlaku dari.',
    path: ['validTo'],
  })
  // Mirror the backend rule so it's flagged inline, not as a submit error.
  .refine((d) => d.issuedAt <= d.validTo, {
    message: 'Tanggal terbit tidak boleh setelah berlaku sampai.',
    path: ['issuedAt'],
  });
type Values = z.infer<typeof schema>;
const defaults: Values = {
  vehicleId: '',
  siteId: '',
  issuedAt: '',
  validFrom: '',
  validTo: '',
  status: '',
};
const toForm = (r: DisposalPermitDto): Values => ({
  vehicleId: r.vehicleId,
  siteId: r.siteId,
  issuedAt: r.issuedAt,
  validFrom: r.validFrom,
  validTo: r.validTo,
  status: r.status,
});
// The kitir update DTO only accepts status + validTo (extend/revoke lifecycle).
const buildPayload = (v: Values, isEdit: boolean): Record<string, unknown> =>
  isEdit ? { status: v.status, validTo: v.validTo } : { ...v };
const siteOption = (s: SiteDto): SelectOption => ({ value: s.id, label: `${s.name} (${s.type})` });
const vehicleOption = (v: VehicleDto): SelectOption => ({ value: v.id, label: v.plateNumber });

type StatusFilter = '' | 'ACTIVE' | 'INACTIVE';

export default function DisposalPermitsPage(): JSX.Element {
  const t = useTranslations('nav');
  const [status, setStatus] = useState<StatusFilter>('');
  // Server-side query: page/limit/search + the status toolbar filter.
  const buildQuery = useCallback(
    ({ page, pageSize, search }: ServerQueryParams): string => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      return `?${params.toString()}`;
    },
    [status],
  );
  const manager = useServerResourceManager(disposalPermitsApi, (r) => r.id, buildQuery);
  const { rows: siteRows } = useResourceList(sitesApi.list);
  const { rows: vehicleRows } = useResourceList(vehiclesApi.list);
  const sites = useMemo(() => siteRows.map(siteOption), [siteRows]);
  const vehicles = useMemo(() => vehicleRows.map(vehicleOption), [vehicleRows]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const columns = useMemo<ColumnDef<DisposalPermitDto, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Kode (Barcode)',
        meta: { label: 'Kode (Barcode)' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm">{row.original.code ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'vehiclePlate',
        header: 'Kendaraan',
        meta: { label: 'Kendaraan' },
        cell: ({ row }) => <span className="font-mono">{row.original.vehiclePlate}</span>,
      },
      { accessorKey: 'siteName', header: 'Lokasi', meta: { label: 'Lokasi' } },
      {
        accessorKey: 'issuedAt',
        header: 'Tanggal Terbit',
        meta: { label: 'Tanggal Terbit', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.issuedAt ? formatDateDisplay(row.original.issuedAt) : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'validFrom',
        header: 'Berlaku Dari',
        meta: { label: 'Berlaku Dari', filterVariant: 'date' },
        cell: ({ row }) => formatDateDisplay(row.original.validFrom),
      },
      {
        accessorKey: 'validTo',
        header: 'Sampai',
        meta: { label: 'Sampai' },
        cell: ({ row }) => formatDateDisplay(row.original.validTo),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusPill domain="disposalPermit" value={row.original.status} />,
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
              resource="disposal-permit"
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

  const editing = manager.editing !== null;

  return (
    <CrudListShell
      title={t('disposalPermits')}
      resource="disposal-permit"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari kode / kendaraan…"
      createLabel="Terbitkan Kitir"
      serverPagination={manager.serverPagination}
      toolbar={
        <>
          <Select
            value={status === '' ? 'ALL' : status}
            onValueChange={(v) => {
              setStatus(v === 'ALL' ? '' : (v as StatusFilter));
              manager.setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-40" aria-label="Filter status">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua status</SelectItem>
              <SelectItem value="ACTIVE">Berlaku</SelectItem>
              <SelectItem value="INACTIVE">Tidak Berlaku</SelectItem>
            </SelectContent>
          </Select>
          <ProtectedAction permission="disposal-permit:create">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden />
              Impor Massal
            </Button>
          </ProtectedAction>
        </>
      }
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        buildPayload={buildPayload}
        title={{ create: 'Terbitkan Kitir', edit: 'Ubah Kitir', view: 'Lihat Kitir' }}
        className="max-w-[520px]"
      >
        <div className="grid gap-4">
          <SelectField
            name="vehicleId"
            label="Kendaraan"
            required
            options={vehicles}
            placeholder="Pilih kendaraan"
            disabled={editing}
          />
          <SelectField
            name="siteId"
            label="Lokasi"
            required
            options={sites}
            placeholder="Pilih lokasi"
            disabled={editing}
          />
          <DateField name="issuedAt" label="Tanggal Terbit" required />
          <DateField name="validFrom" label="Berlaku Dari" required />
          <DateField name="validTo" label="Berlaku Sampai" required />
          <SelectField
            name="status"
            label="Status"
            required
            options={STATUS_OPTIONS}
            placeholder="Pilih status"
          />
        </div>
      </CrudFormDialog>

      <KitirBulkImportDialog
        open={bulkOpen}
        vehicles={vehicleRows}
        sites={siteRows}
        onOpenChange={setBulkOpen}
        onImported={() => void manager.reload()}
      />
    </CrudListShell>
  );
}
