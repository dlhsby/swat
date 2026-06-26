'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { hiddenIdColumn } from '@/components/crud/crud-list-shell';
import { NumberField, SelectField, TextField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { PageHead } from '@/components/shell/page-head';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  notify,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { rolesApi } from '@/lib/roles-api';
import { type ServiceAccountDto, serviceAccountsApi } from '@/lib/service-accounts-api';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  roleId: z.string().uuid('Peran wajib dipilih'),
  // NumberField emits a number; avoid z.coerce (Zod 4 types its input as unknown,
  // which breaks react-hook-form's resolver input/output typing).
  rateLimitPerMin: z.number().int().min(1, 'Minimal 1').max(100000),
  allowedIPs: z.string().max(2000).optional(),
});
type Values = z.infer<typeof schema>;

/** Parse the comma/space/newline-separated allowlist field into a clean array. */
function parseAllowedIPs(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[\s,]+/)
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export default function ServiceAccountsPage(): JSX.Element {
  const t = useTranslations('nav');
  const tc = useTranslations('crud');
  const { rows, loading, error, reload } = useResourceList<ServiceAccountDto>(
    serviceAccountsApi.list,
  );
  const { rows: roles } = useResourceList(rolesApi.list);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceAccountDto | null>(null);
  const [viewing, setViewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ServiceAccountDto | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', roleId: '', rateLimitPerMin: 500, allowedIPs: '' },
  });

  useEffect(() => {
    if (dialogOpen) {
      form.reset(
        editing
          ? {
              name: editing.name,
              roleId: editing.roleId,
              rateLimitPerMin: editing.rateLimitPerMin,
              allowedIPs: editing.allowedIPs.join(', '),
            }
          : { name: '', roleId: '', rateLimitPerMin: 500, allowedIPs: '' },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing]);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);

  const onSubmit = async (values: Values): Promise<void> => {
    setSaving(true);
    try {
      const allowedIPs = parseAllowedIPs(values.allowedIPs);
      if (editing) {
        await serviceAccountsApi.update(editing.id, {
          name: values.name,
          roleId: values.roleId,
          rateLimitPerMin: values.rateLimitPerMin,
          allowedIPs,
        });
        notify.success(tc('updated'));
      } else {
        const created = await serviceAccountsApi.create({
          name: values.name,
          roleId: values.roleId,
          rateLimitPerMin: values.rateLimitPerMin,
          allowedIPs,
        });
        notify.success(tc('created'));
        setApiKey(created.apiKey);
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : tc('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmRevoke = async (): Promise<void> => {
    if (!revokeTarget) {
      return;
    }
    try {
      await serviceAccountsApi.revoke(revokeTarget.id);
      notify.success('Akun layanan telah dicabut.');
      setRevokeTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : tc('deleteError'));
    }
  };

  const columns = useMemo<ColumnDef<ServiceAccountDto, unknown>[]>(
    () => [
      hiddenIdColumn<ServiceAccountDto>(),
      {
        accessorKey: 'name',
        header: 'Nama',
        meta: { label: 'Nama' },
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'apiKeyPrefix',
        header: 'API Key',
        meta: { label: 'API Key' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm">{row.original.apiKeyPrefix}…</span>
        ),
      },
      {
        accessorKey: 'roleName',
        header: 'Peran',
        meta: { label: 'Peran' },
        cell: ({ row }) => <Badge appearance="count">{row.original.roleName}</Badge>,
      },
      {
        accessorKey: 'rateLimitPerMin',
        header: 'Batas/menit',
        meta: { label: 'Batas/menit' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.rateLimitPerMin}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="green" dot>
              Aktif
            </Badge>
          ) : (
            <Badge variant="red" dot>
              Dicabut
            </Badge>
          ),
      },
      {
        accessorKey: 'lastUsedAt',
        header: 'Terakhir dipakai',
        meta: { label: 'Terakhir dipakai' },
        cell: ({ row }) =>
          row.original.lastUsedAt ? (
            <span className="text-body-sm text-neutral-600">
              {new Date(row.original.lastUsedAt).toLocaleString('id-ID')}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
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
              resource="service-account"
              onView={() => {
                setEditing(row.original);
                setViewing(true);
                setDialogOpen(true);
              }}
              onEdit={() => {
                setEditing(row.original);
                setViewing(false);
                setDialogOpen(true);
              }}
              onDelete={row.original.active ? () => setRevokeTarget(row.original) : undefined}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <ProtectedAction permission="service-account:read">
        <Button variant="secondary" asChild>
          <Link href="/service-accounts/audit-log">
            <ScrollText aria-hidden />
            {t('apiAuditLog')}
          </Link>
        </Button>
      </ProtectedAction>
      <ProtectedAction permission="service-account:create">
        <Button
          onClick={() => {
            setEditing(null);
            setViewing(false);
            setDialogOpen(true);
          }}
        >
          {tc('new')}
        </Button>
      </ProtectedAction>
    </div>
  );

  return (
    <>
      <PageHead title={t('serviceAccounts')} actions={headerActions} />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari akun layanan…"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {viewing
                ? 'Lihat Akun Layanan'
                : editing
                  ? 'Ubah Akun Layanan'
                  : 'Tambah Akun Layanan'}
            </DialogTitle>
            <DialogDescription className="sr-only">Formulir akun layanan</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!editing ? (
                <Alert variant="info">
                  API key dibuat saat penyimpanan dan hanya ditampilkan satu kali. Salin dan simpan
                  secara aman.
                </Alert>
              ) : null}
              <fieldset disabled={viewing} className="space-y-4">
                <TextField name="name" label="Nama" required placeholder="TPA Jembatan Timbang" />
                <SelectField
                  name="roleId"
                  label="Peran"
                  required
                  options={roleOptions}
                  placeholder="Pilih peran"
                />
                <NumberField name="rateLimitPerMin" label="Batas permintaan / menit" required />
                <TextField
                  name="allowedIPs"
                  label="Daftar IP yang diizinkan"
                  description="Pisahkan dengan koma. Kosongkan untuk mengizinkan semua IP."
                  placeholder="10.0.0.5, 10.0.0.6"
                />
              </fieldset>
              <DialogFooter>
                {viewing ? (
                  <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                    {tc('close')}
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button type="submit" loading={saving}>
                      {tc('save')}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* One-time API key reveal */}
      <Dialog open={apiKey !== null} onOpenChange={(open) => !open && setApiKey(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>API Key Baru</DialogTitle>
            <DialogDescription>
              Salin sekarang — key ini tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>
          {apiKey ? (
            <div className="space-y-3">
              <div className="rounded-base border border-neutral-200 bg-neutral-50 p-3">
                <code className="select-all break-all font-mono text-body-sm font-semibold">
                  {apiKey}
                </code>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(apiKey);
                  notify.success('API key disalin.');
                }}
              >
                Salin API key
              </Button>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setApiKey(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Cabut akun layanan?"
        description="Kunci API tidak akan dapat digunakan lagi. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Cabut"
        onConfirm={() => void onConfirmRevoke()}
      />
    </>
  );
}
