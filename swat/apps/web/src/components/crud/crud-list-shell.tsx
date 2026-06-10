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

/** Hidden-by-default audit columns (timestamps + actor names) appended to every master-data table. */
function auditColumns<T>(): ColumnDef<T, unknown>[] {
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
      header: 'Dibuat',
      enableColumnFilter: false,
      meta: { label: 'Dibuat', defaultHidden: true },
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
      header: 'Diubah',
      enableColumnFilter: false,
      meta: { label: 'Diubah', defaultHidden: true },
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

  const createButton = (
    <ProtectedAction permission={`${resource}:create`}>
      <Button onClick={manager.openCreate}>
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    </ProtectedAction>
  );

  // Append hidden audit columns, keeping the row-actions column last.
  const actionsIdx = columns.findIndex((c) => c.id === 'actions');
  const audit = auditColumns<T>();
  const mergedColumns =
    actionsIdx >= 0
      ? [...columns.slice(0, actionsIdx), ...audit, ...columns.slice(actionsIdx)]
      : [...columns, ...audit];

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
        searchPlaceholder={searchPlaceholder ?? t('search')}
        toolbar={toolbar}
        actions={createButton}
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
