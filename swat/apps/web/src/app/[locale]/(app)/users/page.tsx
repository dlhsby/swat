'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { hiddenIdColumn } from '@/components/crud/crud-list-shell';
import { SelectField, TextField } from '@/components/crud/fields';
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
  DropdownMenuItem,
  Form,
  StatusPill,
  notify,
} from '@/components/ui';
import { UserAvatar } from '@/components/user-avatar';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { forceResetPassword } from '@/lib/auth-api';
import { rolesApi } from '@/lib/roles-api';
import { type CreatedUserDto, type UserDto, usersApi } from '@/lib/users-api';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  username: z.string().min(3, 'Nama pengguna minimal 3 karakter').max(100),
  roleId: z.string().uuid('Peran wajib dipilih'),
});
type Values = z.infer<typeof schema>;

interface TempCredential {
  username: string;
  password: string;
}

export default function UsersPage(): JSX.Element {
  const t = useTranslations('nav');
  const tc = useTranslations('crud');
  const { rows, loading, error, reload } = useResourceList<UserDto>(usersApi.list);
  const { rows: roles } = useResourceList(rolesApi.list);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [credential, setCredential] = useState<TempCredential | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', username: '', roleId: '' },
  });

  useEffect(() => {
    if (dialogOpen) {
      form.reset(
        editing
          ? { name: editing.name, username: editing.username, roleId: editing.roleId }
          : { name: '', username: '', roleId: '' },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing]);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);

  const onSubmit = async (values: Values): Promise<void> => {
    setSaving(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, { name: values.name, roleId: values.roleId });
        notify.success(tc('updated'));
      } else {
        const created: CreatedUserDto = await usersApi.create(values);
        notify.success(tc('created'));
        setCredential({ username: created.username, password: created.temporaryPassword });
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : tc('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmReset = async (): Promise<void> => {
    if (!resetTarget) {
      return;
    }
    try {
      const result = await forceResetPassword(resetTarget.id);
      setResetTarget(null);
      setCredential({ username: result.username, password: result.temporaryPassword });
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal mengatur ulang kata sandi.');
    }
  };

  const onConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    try {
      await usersApi.remove(deleteTarget.id);
      notify.success(tc('deleted'));
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : tc('deleteError'));
    }
  };

  const columns = useMemo<ColumnDef<UserDto, unknown>[]>(
    () => [
      hiddenIdColumn<UserDto>(),
      {
        accessorKey: 'name',
        header: 'Nama',
        meta: { label: 'Nama' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <UserAvatar
              name={row.original.name}
              role={row.original.roleName}
              className="h-7 w-7 text-tiny"
            />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'username',
        header: 'Nama Pengguna',
        meta: { label: 'Nama Pengguna' },
        cell: ({ row }) => <span className="font-mono text-body-sm">@{row.original.username}</span>,
      },
      {
        accessorKey: 'roleName',
        header: 'Peran',
        meta: { label: 'Peran' },
        cell: ({ row }) => <Badge appearance="count">{row.original.roleName}</Badge>,
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) =>
          row.original.mustChangePassword ? (
            <StatusPill domain="user" value="MUST_CHANGE" />
          ) : (
            <Badge variant="green" dot>
              Aktif
            </Badge>
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
              resource="user"
              onEdit={() => {
                setEditing(row.original);
                setDialogOpen(true);
              }}
              onDelete={() => setDeleteTarget(row.original)}
              extra={
                <ProtectedAction permission="user:manage">
                  <DropdownMenuItem onSelect={() => setResetTarget(row.original)}>
                    <KeyRound aria-hidden />
                    Reset paksa kata sandi
                  </DropdownMenuItem>
                </ProtectedAction>
              }
            />
          </div>
        ),
      },
    ],
    [],
  );

  const createButton = (
    <ProtectedAction permission="user:create">
      <Button
        onClick={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      >
        {tc('new')}
      </Button>
    </ProtectedAction>
  );

  return (
    <>
      <PageHead title={t('users')} actions={createButton} />

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari pengguna…"
        emptyAction={createButton}
      />

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Ubah Pengguna' : 'Tambah Pengguna'}</DialogTitle>
            <DialogDescription className="sr-only">Formulir pengguna</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!editing ? (
                <Alert variant="info">
                  Pengguna baru menerima kata sandi sementara dan wajib menggantinya saat masuk
                  pertama. Bagikan kata sandi tersebut secara aman.
                </Alert>
              ) : null}
              <TextField name="name" label="Nama" required />
              <TextField name="username" label="Nama Pengguna" required />
              <SelectField
                name="roleId"
                label="Peran"
                required
                options={roleOptions}
                placeholder="Pilih peran"
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" loading={saving}>
                  {tc('save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Temp credential result */}
      <Dialog open={credential !== null} onOpenChange={(open) => !open && setCredential(null)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Kata Sandi Sementara</DialogTitle>
            <DialogDescription>
              Bagikan kredensial ini secara aman. Pengguna wajib menggantinya saat masuk.
            </DialogDescription>
          </DialogHeader>
          {credential ? (
            <div className="space-y-2 rounded-base border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-body-sm">
                Pengguna: <span className="font-mono font-semibold">@{credential.username}</span>
              </p>
              <p className="text-body-sm">
                Kata sandi:{' '}
                <span className="select-all font-mono font-semibold">{credential.password}</span>
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCredential(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="Reset kata sandi pengguna?"
        description="Pengguna akan menerima kata sandi sementara dan wajib menggantinya saat masuk."
        confirmLabel="Reset"
        onConfirm={() => void onConfirmReset()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={tc('confirmDeleteTitle')}
        description={tc('confirmDeleteBody')}
        confirmLabel={tc('delete')}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  );
}
