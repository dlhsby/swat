'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { IdCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import {
  DateField,
  type SelectOption,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { DriverLicensesSheet } from '@/components/personnel/driver-licenses-sheet';
import { Avatar, AvatarFallback, DropdownMenuItem, StatusPill } from '@/components/ui';
import { useOptions } from '@/hooks/use-options';
import { useResourceManager } from '@/hooks/use-resource-manager';
import { formatDateDisplay, initialsOf } from '@/lib/format';
import { type DriverDto, type SiteDto, driversApi, sitesApi } from '@/lib/master-api';

const EMPLOYMENT_OPTIONS: readonly SelectOption[] = [
  { value: 'SATGAS', label: 'Satgas' },
  { value: 'PNS', label: 'PNS' },
  { value: 'HONORER', label: 'Honorer' },
];

// K3 (occupational safety) training status — the two legacy values, SUDAH/BELUM.
const K3_OPTIONS: readonly SelectOption[] = [
  { value: 'SUDAH', label: 'Sudah' },
  { value: 'BELUM', label: 'Belum' },
];
const k3Label = (v: string | null): string =>
  K3_OPTIONS.find((o) => o.value === v)?.label ?? (v || '—');

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  idCardNumber: z.string().regex(/^\d{16}$/, 'Nomor KTP harus 16 digit angka'),
  poolSiteId: z.string().uuid('Pool wajib dipilih'),
  employmentStatus: z.enum(['SATGAS', 'PNS', 'HONORER']),
  birthDate: z
    .string()
    .min(1, 'Tanggal lahir wajib diisi')
    // Mirror the backend age check (birthDate + 18y <= now) so an under-18 date
    // is flagged inline instead of bouncing back as a submit error.
    .refine((value) => {
      const birth = new Date(value);
      if (Number.isNaN(birth.getTime())) {
        return false;
      }
      const eighteenth = new Date(birth);
      eighteenth.setUTCFullYear(eighteenth.getUTCFullYear() + 18);
      return eighteenth.getTime() <= Date.now();
    }, 'Pengemudi harus berusia minimal 18 tahun'),
  contact: z.string().min(1, 'Kontak wajib diisi').max(100),
  originAddress: z.string().min(1, 'Alamat asal wajib diisi').max(256),
  currentAddress: z.string().min(1, 'Alamat saat ini wajib diisi').max(256),
  safetyTraining: z.string().max(100).optional(),
  notes: z.string().max(256).optional(),
});
type Values = z.infer<typeof schema>;
const defaults: Values = {
  name: '',
  idCardNumber: '',
  poolSiteId: '',
  employmentStatus: 'SATGAS',
  birthDate: '',
  contact: '',
  originAddress: '',
  currentAddress: '',
  safetyTraining: undefined,
  notes: undefined,
};
const toForm = (r: DriverDto): Values => ({
  name: r.name,
  idCardNumber: r.idCardNumber,
  poolSiteId: r.poolSiteId,
  employmentStatus: r.employmentStatus,
  birthDate: r.birthDate,
  contact: r.contact,
  originAddress: r.originAddress,
  currentAddress: r.currentAddress,
  safetyTraining: r.safetyTraining ?? undefined,
  notes: r.notes ?? undefined,
});
const poolOption = (s: SiteDto): SelectOption => ({ value: s.id, label: s.name });

export default function DriversPage(): JSX.Element {
  const t = useTranslations('nav');
  const manager = useResourceManager(driversApi, (r) => r.id);
  const { options: pools } = useOptions(sitesApi.list, poolOption);
  const [licensesFor, setLicensesFor] = useState<DriverDto | null>(null);

  const columns = useMemo<ColumnDef<DriverDto, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nama',
        meta: { label: 'Nama' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-tiny">{initialsOf(row.original.name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'idCardNumber',
        header: 'KTP',
        meta: { label: 'KTP' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm">{row.original.idCardNumber}</span>
        ),
      },
      {
        accessorKey: 'employmentStatus',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusPill domain="employment" value={row.original.employmentStatus} />,
      },
      { accessorKey: 'poolSiteName', header: 'Pool', meta: { label: 'Pool' } },
      { accessorKey: 'contact', header: 'Kontak', meta: { label: 'Kontak' } },
      {
        accessorKey: 'birthDate',
        header: 'Tanggal Lahir',
        meta: { label: 'Tanggal Lahir', defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.birthDate ? formatDateDisplay(row.original.birthDate) : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'originAddress',
        header: 'Alamat Asal',
        meta: { label: 'Alamat Asal', defaultHidden: true },
        cell: ({ row }) => <span>{row.original.originAddress || '—'}</span>,
      },
      {
        accessorKey: 'currentAddress',
        header: 'Alamat Sekarang',
        meta: { label: 'Alamat Sekarang', defaultHidden: true },
        cell: ({ row }) => <span>{row.original.currentAddress || '—'}</span>,
      },
      {
        accessorKey: 'safetyTraining',
        header: 'Pelatihan K3',
        meta: { label: 'Pelatihan K3', defaultHidden: true },
        cell: ({ row }) => <span>{k3Label(row.original.safetyTraining)}</span>,
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
              resource="driver"
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
              extra={
                <ProtectedAction permission="license:read">
                  <DropdownMenuItem onSelect={() => setLicensesFor(row.original)}>
                    <IdCard aria-hidden />
                    Kelola SIM
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
      title={t('drivers')}
      resource="driver"
      manager={manager}
      columns={columns}
      searchPlaceholder="Cari pengemudi / KTP…"
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: 'Tambah Pengemudi', edit: 'Ubah Pengemudi' }}
        className="max-w-[640px]"
      >
        <div className="grid gap-4">
          <TextField name="name" label="Nama" required />
          <TextField name="idCardNumber" label="Nomor KTP" required placeholder="16 digit" />
          <SelectField
            name="poolSiteId"
            label="Pool"
            required
            options={pools}
            placeholder="Pilih pool"
          />
          <SelectField
            name="employmentStatus"
            label="Status Kepegawaian"
            required
            options={EMPLOYMENT_OPTIONS}
          />
          <DateField name="birthDate" label="Tanggal Lahir" required />
          <TextField name="contact" label="Kontak" required placeholder="08xx…" />
        </div>
        <TextareaField name="originAddress" label="Alamat Asal" required />
        <TextareaField name="currentAddress" label="Alamat Saat Ini" required />
        <div className="grid gap-4">
          <SelectField
            name="safetyTraining"
            label="Pelatihan K3"
            options={K3_OPTIONS}
            placeholder="Pilih status"
          />
        </div>
        <TextareaField name="notes" label="Catatan" placeholder="Opsional" />
      </CrudFormDialog>

      <DriverLicensesSheet
        driver={licensesFor}
        onOpenChange={(open) => !open && setLicensesFor(null)}
      />
    </CrudListShell>
  );
}
