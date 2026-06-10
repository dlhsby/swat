'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Recycle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import {
  DateField,
  NumberField,
  type SelectOption,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { VehicleWasteSourcesSheet } from '@/components/fleet/vehicle-waste-sources-sheet';
import { DropdownMenuItem, StatusPill } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { formatNumber } from '@/lib/format';
import {
  type SiteDto,
  type VehicleDto,
  type VehicleModelDto,
  sitesApi,
  vehicleModelsApi,
  vehiclesApi,
} from '@/lib/master-api';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'GOOD', label: 'Baik' },
  { value: 'MINOR_DAMAGE', label: 'Rusak Ringan' },
  { value: 'MAJOR_DAMAGE', label: 'Rusak Berat' },
  { value: 'LOST', label: 'Hilang' },
];

const schema = z.object({
  plateNumber: z
    .string()
    .min(1, 'Nomor polisi wajib diisi')
    .regex(
      /^[A-Za-z]{1,2}\s?\d{1,4}\s?[A-Za-z]{1,3}$/,
      'Format nomor polisi tidak valid (contoh: L 1234 AB)',
    ),
  modelId: z.string().uuid('Model wajib dipilih'),
  poolSiteId: z.string().uuid('Pool wajib dipilih'),
  status: z.enum(['GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST']),
  manufactureYear: z.coerce.number().int().min(1900, 'Tahun tidak valid').max(2100).optional(),
  chassisNumber: z.string().min(1, 'Nomor rangka wajib diisi').max(100),
  engineNumber: z.string().min(1, 'Nomor mesin wajib diisi').max(100),
  currentTareWeight: z.coerce.number().int().min(0, 'Berat kosong tidak boleh negatif'),
  currentOdometer: z.coerce.number().int().min(0, 'Odometer tidak boleh negatif'),
  currentFuelRatio: z.coerce.number().int('Rasio harus bilangan bulat').min(1, 'Rasio minimal 1'),
  registrationExpiry: z.string().min(1, 'Tanggal STNK wajib diisi'),
  taxExpiry: z.string().min(1, 'Tanggal pajak wajib diisi'),
  notes: z.string().max(512).optional(),
});
type Values = z.infer<typeof schema>;
const defaults: Values = {
  plateNumber: '',
  modelId: '',
  poolSiteId: '',
  status: 'GOOD',
  manufactureYear: undefined,
  chassisNumber: '',
  engineNumber: '',
  currentTareWeight: 0,
  currentOdometer: 0,
  currentFuelRatio: 1,
  registrationExpiry: '',
  taxExpiry: '',
  notes: undefined,
};
const toForm = (r: VehicleDto): Values => ({
  plateNumber: r.plateNumber,
  modelId: r.modelId,
  poolSiteId: r.poolSiteId,
  status: r.status,
  manufactureYear: r.manufactureYear ?? undefined,
  chassisNumber: r.chassisNumber,
  engineNumber: r.engineNumber,
  currentTareWeight: r.currentTareWeight,
  currentOdometer: r.currentOdometer,
  currentFuelRatio: r.currentFuelRatio,
  registrationExpiry: r.registrationExpiry,
  taxExpiry: r.taxExpiry,
  notes: r.notes ?? undefined,
});
const modelOption = (m: VehicleModelDto): SelectOption => ({ value: m.id, label: m.brand });
const poolOption = (s: SiteDto): SelectOption => ({ value: s.id, label: s.name });

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="border-b border-neutral-200 pb-1 text-tiny font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </p>
  );
}

/** Vehicles (Kendaraan) — embedded tab of the combined vehicle page. */
export function VehiclesTab(): JSX.Element {
  const manager = useResourceManager(vehiclesApi, (r) => r.id);
  const { options: models } = useOptions(vehicleModelsApi.list, modelOption);
  const { options: pools } = useOptions(sitesApi.list, poolOption);
  const [sourcesFor, setSourcesFor] = useState<VehicleDto | null>(null);

  const columns = useMemo<ColumnDef<VehicleDto, unknown>[]>(
    () => [
      {
        accessorKey: 'plateNumber',
        header: 'Nopol',
        meta: { label: 'Nopol' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.plateNumber}</span>
        ),
      },
      { accessorKey: 'modelBrand', header: 'Merek/Model', meta: { label: 'Merek/Model' } },
      { accessorKey: 'poolSiteName', header: 'Pool', meta: { label: 'Pool' } },
      {
        accessorKey: 'currentOdometer',
        header: 'Odometer',
        meta: { label: 'Odometer' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.currentOdometer)} km</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusPill domain="vehicle" value={row.original.status} />,
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
              resource="vehicle"
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                <ProtectedAction permission="vehicle:read">
                  <DropdownMenuItem onSelect={() => setSourcesFor(row.original)}>
                    <Recycle aria-hidden />
                    Kelola Sumber Sampah
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
      embedded
      title="Kendaraan"
      resource="vehicle"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari nopol / model…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Kendaraan', edit: 'Ubah Kendaraan' }}
      >
        <SectionLabel>Data Dasar</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="plateNumber" label="Nomor Polisi" required placeholder="L 1234 AB" />
          <NumberField name="manufactureYear" label="Tahun" min={1900} max={2100} />
          <SelectField
            name="modelId"
            label="Merek/Model"
            required
            options={models}
            placeholder="Pilih model"
          />
          <SelectField
            name="poolSiteId"
            label="Pool"
            required
            options={pools}
            placeholder="Pilih pool"
          />
          <SelectField name="status" label="Status" required options={STATUS_OPTIONS} />
        </div>

        <SectionLabel>Identitas & Dimensi</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="chassisNumber" label="Nomor Rangka" required />
          <TextField name="engineNumber" label="Nomor Mesin" required />
          <NumberField name="currentTareWeight" label="Berat Kosong" required unit="kg" min={0} />
          <NumberField name="currentOdometer" label="Odometer" required unit="km" min={0} />
          <NumberField name="currentFuelRatio" label="Rasio BBM" required min={1} />
        </div>

        <SectionLabel>Masa Berlaku</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField name="registrationExpiry" label="STNK Berlaku Sampai" required />
          <DateField name="taxExpiry" label="Pajak STNK Sampai" required />
        </div>

        <TextareaField name="notes" label="Catatan" placeholder="Opsional" />
      </CrudFormDialog>

      <VehicleWasteSourcesSheet
        vehicle={sourcesFor}
        onOpenChange={(open) => !open && setSourcesFor(null)}
      />
    </CrudListShell>
  );
}
