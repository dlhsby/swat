'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, Recycle, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
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
import { VehicleInspectionsSheet } from '@/components/fleet/vehicle-inspections-sheet';
import { VehicleMaintenanceSheet } from '@/components/fleet/vehicle-maintenance-sheet';
import { VehicleWasteSourcesSheet } from '@/components/fleet/vehicle-waste-sources-sheet';
import { DropdownMenuItem, StatusPill } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceList } from '@/hooks/use-resource-list';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { formatDateDisplay, formatNumber } from '@/lib/format';
import {
  type SiteDto,
  type VehicleDto,
  type VehicleModelDto,
  type VehicleTypeDto,
  sitesApi,
  vehicleModelsApi,
  vehicleTypesApi,
  vehiclesApi,
} from '@/lib/master-api';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'GOOD', label: 'Baik' },
  { value: 'MINOR_DAMAGE', label: 'Rusak Ringan' },
  { value: 'MAJOR_DAMAGE', label: 'Rusak Berat' },
  { value: 'LOST', label: 'Hilang' },
];

const schema = z.object({
  // Lenient: a road plate (L 1234 AB) OR an asset label for non-road equipment
  // (EXCAVATOR, EXA CAT 31, DRUM) / annotated legacy plates (L9484NP(S)).
  plateNumber: z
    .string()
    .min(1, 'Nomor polisi wajib diisi')
    .max(20, 'Maksimal 20 karakter')
    .regex(
      /^[A-Za-z0-9 ()+\-./]{1,20}$/,
      'Nomor polisi / kode aset maks 20 karakter (huruf, angka, spasi, ( ) + - . /)',
    ),
  // Transient cascade selector — chosen first to filter the model list. Stripped
  // from the payload (the vehicle stores only modelId; its type is derived).
  vehicleTypeId: z.string().min(1, 'Tipe kendaraan wajib dipilih'),
  modelId: z.string().uuid('Model wajib dipilih'),
  poolSiteId: z.string().uuid('Pool wajib dipilih'),
  // '' is the "not chosen yet" sentinel — no default status; refine forces a pick.
  status: z.enum(['GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST']).or(z.literal('')),
  manufactureYear: z.coerce.number().int().min(1900, 'Tahun tidak valid').max(2100).optional(),
  chassisNumber: z.string().min(1, 'Nomor rangka wajib diisi').max(100),
  engineNumber: z.string().min(1, 'Nomor mesin wajib diisi').max(100),
  currentTareWeight: z.coerce.number().int().min(0, 'Berat kosong tidak boleh negatif'),
  currentOdometer: z.coerce.number().int().min(0, 'Odometer tidak boleh negatif'),
  currentFuelRatio: z.coerce.number().int('Rasio harus bilangan bulat').min(1, 'Rasio minimal 1'),
  registrationExpiry: z.string().min(1, 'Tanggal STNK wajib diisi'),
  taxExpiry: z.string().min(1, 'Tanggal pajak wajib diisi'),
  notes: z.string().max(512).optional(),
}).refine((d) => d.status !== '', { message: 'Status wajib dipilih', path: ['status'] });
type Values = z.infer<typeof schema>;
const defaults: Values = {
  plateNumber: '',
  vehicleTypeId: '',
  modelId: '',
  poolSiteId: '',
  status: '',
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
  // Derived from the model once the model list loads (see ModelCascadeFields).
  vehicleTypeId: '',
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
// vehicleTypeId is a UI-only cascade filter — drop it before sending.
const buildPayload = (v: Values): Record<string, unknown> => {
  const { vehicleTypeId: _vehicleTypeId, ...rest } = v;
  return rest;
};
const typeOption = (a: VehicleTypeDto): SelectOption => ({ value: a.id, label: a.name });
const poolOption = (s: SiteDto): SelectOption => ({ value: s.id, label: s.name });

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="border-b border-neutral-200 pb-1 text-tiny font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </p>
  );
}

/**
 * Type → model cascade (mirrors the legacy app): the user picks a vehicle type
 * first, and the model list narrows to that type. The model picker stays
 * disabled until a type is chosen. On edit, the type is derived from the saved
 * model so the right list shows; changing the type clears a now-invalid model.
 */
function ModelCascadeFields({
  types,
  models,
}: {
  types: readonly SelectOption[];
  models: readonly VehicleModelDto[];
}): JSX.Element {
  const form = useFormContext<Values>();
  const typeId = form.watch('vehicleTypeId');
  const modelId = form.watch('modelId');

  // Edit: derive the type from the already-selected model once models load.
  useEffect(() => {
    if (!typeId && modelId) {
      const model = models.find((m) => m.id === modelId);
      if (model) form.setValue('vehicleTypeId', model.vehicleTypeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, models]);

  // Changing the type invalidates a model from a different type — clear it.
  useEffect(() => {
    if (modelId && typeId) {
      const model = models.find((m) => m.id === modelId);
      if (model && model.vehicleTypeId !== typeId) {
        form.setValue('modelId', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      models
        .filter((m) => !typeId || m.vehicleTypeId === typeId)
        .map((m) => ({ value: m.id, label: m.brand })),
    [models, typeId],
  );

  return (
    <>
      <SelectField
        name="vehicleTypeId"
        label="Tipe Kendaraan"
        required
        options={types}
        placeholder="Pilih tipe kendaraan"
      />
      <SelectField
        name="modelId"
        label="Merek/Model"
        required
        options={modelOptions}
        placeholder={typeId ? 'Pilih model' : 'Pilih tipe kendaraan dahulu'}
        disabled={!typeId}
      />
    </>
  );
}

/** Vehicles (Kendaraan) — embedded tab of the combined vehicle page. */
export function VehiclesTab(): JSX.Element {
  const manager = useResourceManager(vehiclesApi, (r) => r.id);
  // Full model rows (need vehicleTypeId for the cascade); types for the picker.
  const { rows: modelRows } = useResourceList(vehicleModelsApi.list);
  const { options: types } = useOptions(vehicleTypesApi.list, typeOption);
  const { options: pools } = useOptions(sitesApi.list, poolOption);
  const [sourcesFor, setSourcesFor] = useState<VehicleDto | null>(null);
  const [inspectFor, setInspectFor] = useState<VehicleDto | null>(null);
  const [maintainFor, setMaintainFor] = useState<VehicleDto | null>(null);

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
        accessorKey: 'gpsCoverage',
        header: 'Cakupan GPS',
        meta: { label: 'Cakupan GPS' },
        cell: ({ row }) => <StatusPill domain="gpsCoverage" value={row.original.gpsCoverage} />,
      },
      {
        accessorKey: 'manufactureYear',
        header: 'Tahun',
        meta: { label: 'Tahun', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.manufactureYear ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'chassisNumber',
        header: 'Nomor Rangka',
        meta: { label: 'Nomor Rangka', defaultHidden: true },
        cell: ({ row }) => <span className="font-mono">{row.original.chassisNumber || '—'}</span>,
      },
      {
        accessorKey: 'engineNumber',
        header: 'Nomor Mesin',
        meta: { label: 'Nomor Mesin', defaultHidden: true },
        cell: ({ row }) => <span className="font-mono">{row.original.engineNumber || '—'}</span>,
      },
      {
        accessorKey: 'currentTareWeight',
        header: 'Berat Kosong',
        meta: { label: 'Berat Kosong', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.currentTareWeight)} kg</span>
        ),
      },
      {
        accessorKey: 'currentFuelRatio',
        header: 'Rasio BBM',
        meta: { label: 'Rasio BBM', defaultHidden: true, filterVariant: 'number' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.currentFuelRatio}</span>,
      },
      {
        accessorKey: 'registrationExpiry',
        header: 'STNK Berlaku',
        meta: { label: 'STNK Berlaku', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.registrationExpiry
              ? formatDateDisplay(row.original.registrationExpiry)
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'taxExpiry',
        header: 'Pajak Sampai',
        meta: { label: 'Pajak Sampai', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.taxExpiry ? formatDateDisplay(row.original.taxExpiry) : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Catatan',
        meta: { label: 'Catatan', defaultHidden: true },
        cell: ({ row }) => <span>{row.original.notes || '—'}</span>,
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
              onView={() => manager.openView(row.original)}
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                <>
                  <ProtectedAction permission="vehicle:read">
                    <DropdownMenuItem onSelect={() => setSourcesFor(row.original)}>
                      <Recycle aria-hidden />
                      Kelola Sumber Sampah
                    </DropdownMenuItem>
                  </ProtectedAction>
                  <ProtectedAction permission="inspection:read">
                    <DropdownMenuItem onSelect={() => setInspectFor(row.original)}>
                      <ClipboardCheck aria-hidden />
                      Pemeriksaan Kendaraan
                    </DropdownMenuItem>
                  </ProtectedAction>
                  <ProtectedAction permission="maintenance:read">
                    <DropdownMenuItem onSelect={() => setMaintainFor(row.original)}>
                      <Wrench aria-hidden />
                      Perawatan Kendaraan
                    </DropdownMenuItem>
                  </ProtectedAction>
                </>
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
        buildPayload={buildPayload}
        title={{ create: 'Tambah Kendaraan', edit: 'Ubah Kendaraan', view: 'Lihat Kendaraan' }}
      >
        <SectionLabel>Data Dasar</SectionLabel>
        <div className="grid gap-4">
          <TextField name="plateNumber" label="Nomor Polisi" required placeholder="L 1234 AB" />
          <NumberField name="manufactureYear" label="Tahun" min={1900} max={2100} />
          <ModelCascadeFields types={types} models={modelRows} />
          <SelectField
            name="poolSiteId"
            label="Pool"
            required
            options={pools}
            placeholder="Pilih pool"
          />
          <SelectField
            name="status"
            label="Status"
            required
            options={STATUS_OPTIONS}
            placeholder="Pilih status"
          />
        </div>

        <SectionLabel>Identitas & Dimensi</SectionLabel>
        <div className="grid gap-4">
          <TextField name="chassisNumber" label="Nomor Rangka" required />
          <TextField name="engineNumber" label="Nomor Mesin" required />
          <NumberField name="currentTareWeight" label="Berat Kosong" required unit="kg" min={0} />
          <NumberField name="currentOdometer" label="Odometer" required unit="km" min={0} />
          <NumberField name="currentFuelRatio" label="Rasio BBM" required min={1} />
        </div>

        <SectionLabel>Masa Berlaku</SectionLabel>
        <div className="grid gap-4">
          <DateField name="registrationExpiry" label="STNK Berlaku Sampai" required />
          <DateField name="taxExpiry" label="Pajak STNK Sampai" required />
        </div>

        <TextareaField name="notes" label="Catatan" placeholder="Opsional" />
      </CrudFormDialog>

      <VehicleWasteSourcesSheet
        vehicle={sourcesFor}
        onOpenChange={(open) => !open && setSourcesFor(null)}
      />
      <VehicleInspectionsSheet
        vehicle={inspectFor}
        onOpenChange={(open) => !open && setInspectFor(null)}
      />
      <VehicleMaintenanceSheet
        vehicle={maintainFor}
        onOpenChange={(open) => !open && setMaintainFor(null)}
      />
    </CrudListShell>
  );
}
