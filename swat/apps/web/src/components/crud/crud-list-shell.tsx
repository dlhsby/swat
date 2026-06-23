'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import { Button, ConfirmDialog, DataTable } from '@/components/ui';
import { type BreadcrumbItem } from '@/components/ui';
import { type ResourceManager } from '@/hooks/use-resource-manager';
import { formatDateDisplay } from '@/lib/format';

/** Hidden-by-default `id` column (the UUID), revealable via the column toggle. */
export function hiddenIdColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: 'id',
    accessorFn: (row) => (row as { id?: string }).id ?? null,
    header: 'ID',
    meta: { label: 'ID', defaultHidden: true },
    cell: ({ getValue }) => {
      const value = getValue();
      return (
        <span className="font-mono text-tiny text-neutral-500">
          {typeof value === 'string' && value ? value : '—'}
        </span>
      );
    },
  };
}

/** Hidden-by-default audit columns (timestamps + actor names) appended to every master-data table. */
export function auditColumns<T>(): ColumnDef<T, unknown>[] {
  const dateCell = (value: unknown): JSX.Element => (
    <span className="tabular-nums text-neutral-500">
      {typeof value === 'string' && value ? formatDateDisplay(value) : '—'}
    </span>
  );
  const nameCell = (value: unknown): JSX.Element => (
    <span className="text-neutral-500">{typeof value === 'string' && value ? value : '—'}</span>
  );
  return [
    {
      id: 'createdAt',
      accessorFn: (row) => (row as { createdAt?: string }).createdAt ?? null,
      header: 'Dibuat pada',
      meta: { label: 'Dibuat pada', defaultHidden: true, filterVariant: 'date' },
      cell: ({ getValue }) => dateCell(getValue()),
    },
    {
      id: 'createdByName',
      accessorFn: (row) => (row as { createdByName?: string | null }).createdByName ?? null,
      header: 'Dibuat oleh',
      meta: { label: 'Dibuat oleh', defaultHidden: true },
      cell: ({ getValue }) => nameCell(getValue()),
    },
    {
      id: 'updatedAt',
      accessorFn: (row) => (row as { updatedAt?: string }).updatedAt ?? null,
      header: 'Diubah pada',
      meta: { label: 'Diubah pada', defaultHidden: true, filterVariant: 'date' },
      cell: ({ getValue }) => dateCell(getValue()),
    },
    {
      id: 'updatedByName',
      accessorFn: (row) => (row as { updatedByName?: string | null }).updatedByName ?? null,
      header: 'Diubah oleh',
      meta: { label: 'Diubah oleh', defaultHidden: true },
      cell: ({ getValue }) => nameCell(getValue()),
    },
  ];
}

export interface CrudListShellProps<T> {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  /** Permission base, e.g. `vehicle`. */
  resource: string;
  manager: ResourceManager<T>;
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  /** Extra DataTable toolbar content (status filters). */
  toolbar?: ReactNode;
  createLabel?: string;
  /** Render without a PageHead (e.g. inside a Tabs panel). */
  embedded?: boolean;
  /** The create/edit form dialog (controlled by the manager). */
  children?: ReactNode;
}

/**
 * Master-data list scaffold: PageHead with a permission-gated "Buat Baru",
 * the DataTable (all states), and the delete confirmation. Pages pass columns
 * and render their form dialog as children.
 */
export function CrudListShell<T>({
  title,
  description,
  breadcrumb,
  resource,
  manager,
  columns,
  searchPlaceholder,
  toolbar,
  createLabel,
  embedded = false,
  children,
}: CrudListShellProps<T>): JSX.Element {
  const t = useTranslations('crud');
  const label = createLabel ?? t('new');

  // Empty-state CTA keeps its label; the toolbar action collapses to an icon on
  // mobile (label hidden < sm) so it sits flush with the other icon buttons.
  const makeCreateButton = (labelClassName?: string): JSX.Element => (
    <ProtectedAction permission={`${resource}:create`}>
      <Button onClick={manager.openCreate} aria-label={label}>
        <Plus className="h-4 w-4" aria-hidden />
        <span className={labelClassName}>{label}</span>
      </Button>
    </ProtectedAction>
  );
  const createButton = makeCreateButton();
  const toolbarCreateButton = makeCreateButton('hidden sm:inline');

  // ID leads, the page's own columns follow, then the hidden audit columns, with
  // the row-actions column kept last and pinned to the right edge (sticky) so the
  // data columns scroll underneath it.
  const actionsIdx = columns.findIndex((c) => c.id === 'actions');
  const id = hiddenIdColumn<T>();
  const audit = auditColumns<T>();
  const actionsCol = actionsIdx >= 0 ? columns[actionsIdx] : undefined;
  const pinnedActions: ColumnDef<T>[] = actionsCol
    ? [{ ...actionsCol, meta: { ...actionsCol.meta, pinRight: true } } as ColumnDef<T>]
    : [];
  const mergedColumns = actionsCol
    ? [id, ...columns.slice(0, actionsIdx), ...audit, ...pinnedActions]
    : [id, ...columns, ...audit];

  return (
    <>
      {embedded ? null : (
        <PageHead title={title} description={description} breadcrumb={breadcrumb} />
      )}

      <DataTable
        columns={mergedColumns}
        data={manager.rows}
        loading={manager.loading}
        error={manager.error}
        onRetry={() => void manager.reload()}
        onRefresh={() => void manager.reload()}
        refreshing={manager.loading}
        searchPlaceholder={searchPlaceholder ?? t('search')}
        toolbar={toolbar}
        actions={toolbarCreateButton}
        emptyAction={createButton}
      />

      {children}

      <ConfirmDialog
        open={manager.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            manager.setDeleteTarget(null);
          }
        }}
        title={t('confirmDeleteTitle')}
        description={t('confirmDeleteBody')}
        confirmLabel={t('delete')}
        onConfirm={() => void manager.confirmDelete()}
      />
    </>
  );
}
