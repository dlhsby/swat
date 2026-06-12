'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedAction } from '@/components/auth/protected-action';
import { TextField } from '@/components/crud/fields';
import { PageHead } from '@/components/shell/page-head';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  Skeleton,
  Switch,
  notify,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import {
  OTHER_CATEGORY,
  PERMISSION_CATEGORIES,
  permissionLabel,
  resourceLabel,
} from '@/lib/permission-grouping';
import { type PermissionDto, type RoleDto, permissionsApi, rolesApi } from '@/lib/roles-api';

const roleSchema = z.object({
  name: z.string().min(1, 'Nama peran wajib diisi').max(100),
});
type RoleValues = z.infer<typeof roleSchema>;

export default function RolesPage(): JSX.Element {
  const t = useTranslations('nav');
  const { rows: roles, reload: reloadRoles } = useResourceList(rolesApi.list);
  const { rows: permissions } = useResourceList<PermissionDto>(permissionsApi.list);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);

  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '' },
  });

  // Default to the first role once loaded.
  useEffect(() => {
    if (selectedId === null && roles.length > 0) {
      setSelectedId(roles[0]?.id ?? null);
    }
  }, [roles, selectedId]);

  useEffect(() => {
    if (roleDialogOpen) {
      form.reset({ name: editingRole?.name ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleDialogOpen, editingRole]);

  const loadDetail = useCallback(async (id: string): Promise<void> => {
    setLoadingDetail(true);
    try {
      const detail = await rolesApi.get(id);
      setEnabled(new Set(detail.permissionIds));
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat peran.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      void loadDetail(selectedId);
    }
  }, [selectedId, loadDetail]);

  // Organise the flat permission list into functional categories (Master Data,
  // Pengangkutan, …), each holding its resource sub-groups, in catalogue order.
  const categories = useMemo(() => {
    const byResource = new Map<string, PermissionDto[]>();
    for (const p of [...permissions].sort((a, b) => a.key.localeCompare(b.key))) {
      const resource = p.group || p.key.split(':')[0] || p.key;
      const list = byResource.get(resource);
      if (list) {
        list.push(p);
      } else {
        byResource.set(resource, [p]);
      }
    }
    const used = new Set<string>();
    const known = PERMISSION_CATEGORIES.map((category) => {
      const resources = category.resources
        .filter((r) => byResource.has(r))
        .map((resource) => {
          used.add(resource);
          return { resource, perms: byResource.get(resource) as PermissionDto[] };
        });
      return { category, resources };
    }).filter((c) => c.resources.length > 0);
    const leftover = [...byResource.entries()]
      .filter(([resource]) => !used.has(resource))
      .map(([resource, perms]) => ({ resource, perms }));
    return leftover.length > 0
      ? [...known, { category: OTHER_CATEGORY, resources: leftover }]
      : known;
  }, [permissions]);

  // Controlled accordion: open the first category once the catalog loads (a
  // `defaultValue` would lock to the empty initial render and never open).
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const didInitOpen = useRef(false);
  useEffect(() => {
    const first = categories[0]?.category.id;
    if (!didInitOpen.current && first !== undefined) {
      didInitOpen.current = true;
      setOpenCategories([first]);
    }
  }, [categories]);

  const toggle = (id: string): void => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroup = (perms: PermissionDto[], allOn: boolean): void => {
    setEnabled((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allOn) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  const onSave = async (): Promise<void> => {
    if (selectedId === null) {
      return;
    }
    setSaving(true);
    try {
      await rolesApi.update(selectedId, { permissionIds: [...enabled] });
      notify.success('Izin peran disimpan.');
      await reloadRoles();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan izin.');
    } finally {
      setSaving(false);
    }
  };

  const onSubmitRole = async (values: RoleValues): Promise<void> => {
    setSavingRole(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, { name: values.name });
        notify.success('Nama peran diperbarui.');
      } else {
        const created = await rolesApi.create({ name: values.name, permissionIds: [] });
        notify.success('Peran dibuat.');
        setSelectedId(created.id);
      }
      setRoleDialogOpen(false);
      await reloadRoles();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan peran.');
    } finally {
      setSavingRole(false);
    }
  };

  const onConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    try {
      await rolesApi.remove(deleteTarget.id);
      notify.success('Peran dihapus.');
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
      }
      setDeleteTarget(null);
      await reloadRoles();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus peran.');
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null;

  const addButton = (
    <ProtectedAction permission="role:create">
      <Button
        onClick={() => {
          setEditingRole(null);
          setRoleDialogOpen(true);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Tambah Peran
      </Button>
    </ProtectedAction>
  );

  return (
    <>
      <PageHead title={t('roles')} description="Kelola izin per peran." actions={addButton} />

      <div className="grid gap-[18px] lg:grid-cols-[320px_1fr]">
        {/* Role list (hi-fi `.hf-rolelist`). */}
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-[13px]">
            <b className="text-[13px] font-bold text-neutral-900">Peran</b>
          </div>
          {roles.length === 0 ? (
            <div className="p-4">
              <Skeleton className="h-40" />
            </div>
          ) : (
            roles.map((role) => {
              const active = role.id === selectedId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 border-b border-l-[3px] border-b-neutral-100 px-4 py-[13px] text-left text-[13.5px] transition-colors last:border-b-0',
                    active
                      ? 'border-l-transparent bg-primary-700 font-semibold text-white'
                      : 'border-l-transparent text-neutral-700 hover:bg-neutral-50',
                  )}
                >
                  <ShieldCheck
                    className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-neutral-400')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{role.name}</span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[11px]',
                      active ? 'text-white/75' : 'text-neutral-400',
                    )}
                  >
                    {role.permissionIds.length} izin · {role.userCount} pengguna
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Permission detail */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3 font-semibold text-neutral-900">
                {selectedRole?.name ?? '—'}
              </h2>
              <div className="flex items-center gap-2">
                <ProtectedAction permission="role:update">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Ubah nama peran"
                    disabled={selectedRole === null}
                    onClick={() => {
                      setEditingRole(selectedRole);
                      setRoleDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                </ProtectedAction>
                <ProtectedAction permission="role:delete">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Hapus peran"
                    disabled={selectedRole === null}
                    onClick={() => selectedRole && setDeleteTarget(selectedRole)}
                  >
                    <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
                  </Button>
                </ProtectedAction>
                <ProtectedAction permission="role:update">
                  <Button
                    onClick={() => void onSave()}
                    loading={saving}
                    disabled={selectedId === null}
                  >
                    Simpan Izin
                  </Button>
                </ProtectedAction>
              </div>
            </div>

            <Alert variant="info">
              Menyimpan izin akan mengubah menu yang terlihat untuk peran ini.
            </Alert>

            {loadingDetail ? (
              <Skeleton className="h-64" />
            ) : (
              <Accordion
                type="multiple"
                value={openCategories}
                onValueChange={setOpenCategories}
                className="flex flex-col gap-3"
              >
                {categories.map(({ category, resources }) => {
                  const catPerms = resources.flatMap((r) => r.perms);
                  const catOn = catPerms.filter((p) => enabled.has(p.id)).length;
                  const catAllOn = catOn === catPerms.length;
                  const catChecked =
                    catOn === 0 ? false : catAllOn ? true : ('indeterminate' as const);
                  const Icon = category.icon;
                  return (
                    <AccordionItem
                      key={category.id}
                      value={category.id}
                      className="rounded-base border border-neutral-200 px-3"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={catChecked}
                          aria-label={`Pilih semua izin ${category.label}`}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleGroup(catPerms, catAllOn)}
                        />
                        <AccordionTrigger className="flex-1">
                          <span className="flex flex-1 items-center justify-between gap-2 pr-2">
                            <span className="flex items-center gap-2 font-semibold text-neutral-900">
                              <Icon className="h-4 w-4 text-neutral-400" aria-hidden />
                              {category.label}
                            </span>
                            <Badge appearance="count">{`${catOn}/${catPerms.length}`}</Badge>
                          </span>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent>
                        <div className="flex flex-col gap-3">
                          {resources.map(({ resource, perms }) => {
                            const onCount = perms.filter((p) => enabled.has(p.id)).length;
                            const allOn = onCount === perms.length;
                            const checkedState =
                              onCount === 0 ? false : allOn ? true : ('indeterminate' as const);
                            return (
                              <div key={resource} className="rounded-base bg-neutral-50 p-3">
                                <div className="mb-2.5 flex items-center gap-2.5">
                                  <Checkbox
                                    checked={checkedState}
                                    aria-label={`Pilih semua izin ${resourceLabel(resource)}`}
                                    onCheckedChange={() => toggleGroup(perms, allOn)}
                                  />
                                  <span className="text-tiny font-semibold uppercase tracking-wide text-neutral-500">
                                    {resourceLabel(resource)}
                                  </span>
                                  <Badge appearance="count">{`${onCount}/${perms.length}`}</Badge>
                                </div>
                                <div className="flex flex-col gap-2.5 pl-[26px]">
                                  {perms.map((p) => (
                                    <label
                                      key={p.id}
                                      className="flex cursor-pointer items-center justify-between gap-2.5"
                                    >
                                      <span className="flex min-w-0 flex-col">
                                        <span className="truncate text-body-sm font-medium text-neutral-900">
                                          {permissionLabel(p.key)}
                                        </span>
                                        <span className="truncate font-mono text-[11.5px] text-neutral-400">
                                          {p.key}
                                        </span>
                                      </span>
                                      <Switch
                                        checked={enabled.has(p.id)}
                                        onCheckedChange={() => toggle(p.id)}
                                        aria-label={p.key}
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / rename role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Ubah Nama Peran' : 'Tambah Peran'}</DialogTitle>
            <DialogDescription className="sr-only">Formulir peran</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitRole)} className="space-y-4">
              {!editingRole ? (
                <Alert variant="info">
                  Peran baru dibuat tanpa izin. Pilih izin lalu simpan setelah peran dibuat.
                </Alert>
              ) : null}
              <TextField name="name" label="Nama Peran" required />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setRoleDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={savingRole}>
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus peran?"
        description={`Peran "${deleteTarget?.name ?? ''}" akan dihapus. Peran yang masih dipakai pengguna tidak dapat dihapus.`}
        confirmLabel="Hapus"
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  );
}
