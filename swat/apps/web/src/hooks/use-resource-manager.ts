'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type ResourceApi } from '@/lib/resource-api';

import { useResourceList } from './use-resource-list';

export interface ResourceManager<T> {
  rows: T[];
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  /** The record being edited, or null when creating. */
  editing: T | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  openCreate: () => void;
  openEdit: (row: T) => void;
  saving: boolean;
  /** Create (when `editing` is null) or update the open record. */
  submit: (values: Record<string, unknown>) => Promise<void>;
  deleteTarget: T | null;
  setDeleteTarget: (row: T | null) => void;
  deleting: boolean;
  confirmDelete: () => Promise<void>;
}

/**
 * Orchestrates a master-data CRUD surface: list state, the create/edit dialog,
 * delete confirmation, and the create/update/delete calls with localized
 * toasts. Pages supply the columns and the form; this owns the plumbing.
 */
export function useResourceManager<T>(
  api: ResourceApi<T>,
  idOf: (row: T) => string | number,
): ResourceManager<T> {
  const t = useTranslations('crud');
  const list = useResourceList<T>(api.list);

  const [editing, setEditing] = useState<T | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const message = (err: unknown, fallback: string): string =>
    err instanceof ApiError ? err.message : fallback;

  const openCreate = (): void => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (row: T): void => {
    setEditing(row);
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
    rows: list.rows,
    loading: list.loading,
    error: list.error,
    reload: list.reload,
    editing,
    dialogOpen,
    setDialogOpen,
    openCreate,
    openEdit,
    saving,
    submit,
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
  };
}
