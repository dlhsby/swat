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

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState<Set<number>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  // Default to the first role once loaded.
  useEffect(() => {
    if (selectedId === null && roles.length > 0) {
      setSelectedId(roles[0]?.id ?? null);
    }
  }, [roles, selectedId]);

  const loadDetail = useCallback(async (id: number): Promise<void> => {
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

  const toggle = (id: number): void => {
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

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Role list */}
        <div className="space-y-2">
          {roles.length === 0 ? (
            <Skeleton className="h-40" />
          ) : (
            roles.map((role) => {
              const active = role.id === selectedId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-neutral-200 bg-neutral-0 hover:bg-neutral-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-base',
                      active
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-neutral-100 text-neutral-500',
                    )}
                  >
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate font-medium',
                        active ? 'text-primary-800' : 'text-neutral-900',
                      )}
                    >
                      {role.name}
                    </span>
                    <span className="block text-tiny text-neutral-500">
                      {role.permissionIds.length} izin · {role.userCount} pengguna
                    </span>
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
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perms.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center justify-between gap-3 rounded-base border border-neutral-200 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-body-sm text-neutral-900">
                              {p.description}
                            </span>
                            <span className="block font-mono text-tiny text-neutral-400">
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
