'use client';

import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';

export interface RowActionsProps {
  /** Permission base, e.g. `vehicle` → gates `:update` / `:delete`. */
  resource: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Extra menu items (already gated by the caller), inserted before Delete. */
  extra?: ReactNode;
}

/** Row "⋮" action menu — View/Edit/extra/Delete, each gated by permission. */
export function RowActions({
  resource,
  onView,
  onEdit,
  onDelete,
  extra,
}: RowActionsProps): JSX.Element {
  const t = useTranslations('crud');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('actions')}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView ? (
          <ProtectedAction permission={`${resource}:read`}>
            <DropdownMenuItem onSelect={onView}>
              <Eye aria-hidden />
              {t('view')}
            </DropdownMenuItem>
          </ProtectedAction>
        ) : null}
        {onEdit ? (
          <ProtectedAction permission={`${resource}:update`}>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden />
              {t('edit')}
            </DropdownMenuItem>
          </ProtectedAction>
        ) : null}
        {extra}
        {onDelete ? (
          <ProtectedAction permission={`${resource}:delete`}>
            <DropdownMenuItem destructive onSelect={onDelete}>
              <Trash2 aria-hidden />
              {t('delete')}
            </DropdownMenuItem>
          </ProtectedAction>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
