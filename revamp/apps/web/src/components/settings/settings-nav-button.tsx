'use client';

import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface SettingsNavButtonProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly help?: string;
  readonly active: boolean;
  /** Trailing content (a "N setelan" hint or a dirty badge). Caller styles it. */
  readonly right?: ReactNode;
  readonly onSelect: () => void;
}

/**
 * Left-rail entry shared by the settings master/detail (personal + system tabs), so
 * both sub-menus look identical — mirrors the roles ("Hak Akses") page rail.
 */
export function SettingsNavButton({
  icon: Icon,
  label,
  help,
  active,
  right,
  onSelect,
}: SettingsNavButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 border-b border-l-[3px] border-b-neutral-100 px-4 py-3 text-left transition-colors last:border-b-0',
        active
          ? 'border-l-primary-700 bg-primary-700 text-white'
          : 'border-l-transparent text-neutral-700 hover:bg-neutral-50',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-neutral-400')}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold">{label}</span>
        {help ? (
          <span
            className={cn('block truncate text-tiny', active ? 'text-white/75' : 'text-neutral-500')}
          >
            {help}
          </span>
        ) : null}
      </span>
      {right}
    </button>
  );
}
