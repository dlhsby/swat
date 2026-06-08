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

  return (
    <>
      {embedded ? (
        <div className="mb-3 flex justify-end">{createButton}</div>
      ) : (
        <PageHead
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          actions={createButton}
        />
      )}

      <DataTable
        columns={columns}
        data={manager.rows}
        loading={manager.loading}
        error={manager.error}
        onRetry={() => void manager.reload()}
        searchPlaceholder={searchPlaceholder ?? t('search')}
        toolbar={toolbar}
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
