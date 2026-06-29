'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type ResourceApi } from '@/lib/resource-api';

import {
  type ServerQueryParams,
  type ServerResourceListState,
  useServerResourceList,
} from './use-server-resource-list';

/**
 * Server-side sibling of {@link useResourceManager}: the same CRUD dialog/delete
 * plumbing, but the list is paged/searched/filtered on the SERVER (one page per
 * request) instead of fetching every row. After create/update/delete it refetches
 * the current page. `CrudListShell` consumes `rows`/`loading`/`error` exactly as
 * the client-side manager, and the page wires `manager.serverPagination` into the
 * DataTable. Mirrors `ResourceManager` so it's a near drop-in.
 */
export interface ServerResourceManager<T> extends ServerResourceListState<T> {
  editing: T | null;
  readOnly: boolean;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  openCreate: () => void;
  openEdit: (row: T) => void;
  openView: (row: T) => void;
  saving: boolean;
  submit: (values: Record<string, unknown>) => Promise<void>;
  deleteTarget: T | null;
  setDeleteTarget: (row: T | null) => void;
  deleting: boolean;
  confirmDelete: () => Promise<void>;
}

export function useServerResourceManager<T>(
  api: ResourceApi<T>,
  idOf: (row: T) => string | number,
  buildQuery: (params: ServerQueryParams) => string,
  initialPageSize = 25,
): ServerResourceManager<T> {
  const t = useTranslations('crud');
  const list = useServerResourceList<T>(api.page, buildQuery, initialPageSize);

  const [editing, setEditing] = useState<T | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const message = (err: unknown, fallback: string): string =>
    err instanceof ApiError ? err.message : fallback;

  const openCreate = (): void => {
    setEditing(null);
    setReadOnly(false);
    setDialogOpen(true);
  };
  const openEdit = (row: T): void => {
    setEditing(row);
    setReadOnly(false);
    setDialogOpen(true);
  };
  const openView = (row: T): void => {
    setEditing(row);
    setReadOnly(true);
    setDialogOpen(true);
  };

  const submit = async (values: Record<string, unknown>): Promise<void> => {
    setSaving(true);
    try {
      if (editing) {
        await api.update(idOf(editing), values);
        notify.success(t('updated'));
      } else {
        await api.create(values);
        notify.success(t('created'));
      }
      setDialogOpen(false);
      await list.reload();
    } catch (err) {
      notify.error(message(err, t('saveError')));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await api.remove(idOf(deleteTarget));
      notify.success(t('deleted'));
      setDeleteTarget(null);
      await list.reload();
    } catch (err) {
      notify.error(message(err, t('deleteError')));
    } finally {
      setDeleting(false);
    }
  };

  return {
    ...list,
    editing,
    readOnly,
    dialogOpen,
    setDialogOpen,
    openCreate,
    openEdit,
    openView,
    saving,
    submit,
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
  };
}
