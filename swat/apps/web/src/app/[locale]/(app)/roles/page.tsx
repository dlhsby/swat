'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import { Alert, Button, Card, CardContent, Skeleton, Switch, notify } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { type PermissionDto, permissionsApi, rolesApi } from '@/lib/roles-api';

export default function RolesPage(): JSX.Element {
  const t = useTranslations('nav');
  const { rows: roles, reload: reloadRoles } = useResourceList(rolesApi.list);
  const { rows: permissions } = useResourceList<PermissionDto>(permissionsApi.list);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  // Default to the first role once loaded.
  useEffect(() => {
    if (selectedId === null && roles.length > 0) {
      setSelectedId(roles[0]?.id ?? null);
    }
  }, [roles, selectedId]);

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

  const groups = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const p of [...permissions].sort((a, b) => a.key.localeCompare(b.key))) {
      const resource = p.key.split(':')[0] ?? p.key;
      const list = map.get(resource);
      if (list) {
        list.push(p);
      } else {
        map.set(resource, [p]);
      }
    }
    return [...map.entries()];
  }, [permissions]);

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

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <PageHead title={t('roles')} description="Kelola izin per peran." />

      <div className="grid gap-[18px] lg:grid-cols-[320px_1fr]">
        {/* Role list (hi-fi `.hf-rolelist`). */}
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0">
          <div className="border-b border-neutral-200 px-4 py-[13px]">
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

            <Alert variant="info">
              Menyimpan izin akan mengubah menu yang terlihat untuk peran ini.
            </Alert>

            {loadingDetail ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="space-y-5">
                {groups.map(([resource, perms]) => (
                  <div key={resource}>
                    <p className="mb-2 text-tiny font-semibold uppercase tracking-wide text-neutral-400">
                      {resource}
                    </p>
                    <div className="flex flex-col gap-3">
                      {perms.map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center justify-between gap-2.5"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-body-sm font-medium text-neutral-900">
                              {p.description}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
