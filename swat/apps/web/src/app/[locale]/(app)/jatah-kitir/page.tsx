'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { z } from 'zod';

import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { DateField, type SelectOption, SelectField, TextField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { StatusPill } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { formatDateDisplay } from '@/lib/format';
import {
  type FuelQuotaDto,
  type SiteDto,
  type VehicleDto,
  fuelQuotasApi,
  sitesApi,
  vehiclesApi,
} from '@/lib/master-api';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'ACTIVE', label: 'Berlaku' },
  { value: 'INACTIVE', label: 'Tidak Berlaku' },
];

const schema = z
  .object({
    code: z.string().max(50).optional(),
    vehicleId: z.coerce.number().int().min(1, 'Kendaraan wajib dipilih'),
    siteId: z.coerce.number().int().min(1, 'Lokasi wajib dipilih'),
    issuedAt: z.string().min(1, 'Tanggal terbit wajib diisi'),
    validFrom: z.string().min(1, 'Berlaku dari wajib diisi'),
    validTo: z.string().min(1, 'Berlaku sampai wajib diisi'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .refine((d) => d.validFrom <= d.validTo, {
    message: 'Berlaku sampai harus setelah berlaku dari.',
    path: ['validTo'],
  });
type Values = z.infer<typeof schema>;
const defaults: Values = {
  code: undefined,
  vehicleId: 0,
  siteId: 0,
  issuedAt: '',
  validFrom: '',
  validTo: '',
  status: 'ACTIVE',
};
const toForm = (r: FuelQuotaDto): Values => ({
  code: r.code ?? undefined,
  vehicleId: r.vehicleId,
  siteId: r.siteId,
  issuedAt: r.issuedAt,
  validFrom: r.validFrom,
  validTo: r.validTo,
  status: r.status,
});
// The kitir update DTO only accepts status + validTo (extend/revoke lifecycle).
const buildPayload = (v: Values, isEdit: boolean): Record<string, unknown> =>
  isEdit
    ? { status: v.status, validTo: v.validTo }
    : { ...v, code: v.code && v.code.length > 0 ? v.code : undefined };
const siteOption = (s: SiteDto): SelectOption => ({ value: s.id, label: `${s.name} (${s.type})` });
const vehicleOption = (v: VehicleDto): SelectOption => ({ value: v.id, label: v.plateNumber });

export default function FuelQuotasPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(fuelQuotasApi, (r) => r.id);
  const { options: sites } = useOptions(sitesApi.list, siteOption);
  const { options: vehicles } = useOptions(vehiclesApi.list, vehicleOption);

  const columns = useMemo<ColumnDef<FuelQuotaDto, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Kode',
        meta: { label: 'Kode' },
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
        accessorKey: 'validFrom',
        header: 'Berlaku Dari',
        meta: { label: 'Berlaku Dari' },
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
        cell: ({ row }) => <StatusPill domain="fuelQuota" value={row.original.status} />,
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
              resource="fuel-quota"
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
      title={t('fuelQuotas')}
      resource="fuel-quota"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari kode / kendaraan…"
      createLabel="Terbitkan Kitir"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        buildPayload={buildPayload}
        title={{ create: 'Terbitkan Kitir', edit: 'Ubah Kitir' }}
        className="max-w-[520px]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="vehicleId"
            label="Kendaraan"
            required
            numeric
            options={vehicles}
            placeholder="Pilih kendaraan"
            disabled={editing}
          />
          <SelectField
            name="siteId"
            label="Lokasi"
            required
            numeric
            options={sites}
            placeholder="Pilih lokasi"
            disabled={editing}
          />
          <DateField name="issuedAt" label="Tanggal Terbit" required />
          <DateField name="validFrom" label="Berlaku Dari" required />
          <DateField name="validTo" label="Berlaku Sampai" required />
          <SelectField name="status" label="Status" required options={STATUS_OPTIONS} />
        </div>
        {!editing ? (
          <TextField name="code" label="Kode (opsional)" placeholder="Otomatis bila kosong" />
        ) : null}
      </CrudFormDialog>
    </CrudListShell>
  );
}
