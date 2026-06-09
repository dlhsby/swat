'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedAction } from '@/components/auth/protected-action';
import { useSidebar } from '@/components/shell/sidebar-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { type NavGroup, type NavLeaf, NAV_GROUPS } from '@/lib/nav';

/** Indented, text-only leaf link inside a collapsible group (hi-fi `.hf-navlink`). */
function NavLink({ leaf, onNavigate }: { leaf: NavLeaf; onNavigate?: () => void }): JSX.Element {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const active = pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);

  if (leaf.comingSoon) {
    return (
      <span
        className="ml-[-3px] flex cursor-default items-center gap-2.5 rounded-lg border-l-[3px] border-transparent py-2 pl-[38px] pr-2.5 text-[13px] font-medium text-neutral-400"
        aria-disabled
      >
        <span className="flex-1 truncate">{t(leaf.key)}</span>
        <span className="rounded-[5px] bg-neutral-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-neutral-400">
          {tc('comingSoon')}
        </span>
      </span>
    );
  }

  return (
    <Link
      href={leaf.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'ml-[-3px] flex items-center gap-2.5 rounded-lg border-l-[3px] py-2 pl-[38px] pr-2.5 text-[13px] font-medium leading-tight transition-colors',
        active
          ? 'border-primary-600 bg-primary-50 font-semibold text-primary-700'
          : 'border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
      )}
    >
      <span className="truncate">{t(leaf.key)}</span>
    </Link>
  );
}

/** Standalone top-level leaf with an icon (hi-fi `.hf-navtop`, e.g. Dashboard). */
function NavTop({
  leaf,
  collapsed,
  onNavigate,
}: {
  leaf: NavLeaf;
  collapsed: boolean;
  onNavigate?: () => void;
}): JSX.Element {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const Icon = leaf.icon;
  const active = pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);

  return (
    <Link
      href={leaf.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? t(leaf.key) : undefined}
      className={cn(
        'ml-[-3px] flex items-center gap-2.5 rounded-lg border-l-[3px] py-2.5 text-[13px] font-semibold transition-colors',
        collapsed ? 'justify-center px-0' : 'px-2.5',
        active
          ? 'border-primary-600 bg-primary-50 text-primary-700'
          : 'border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active ? 'text-primary-700' : 'text-neutral-400',
        )}
        aria-hidden
      />
      {collapsed ? null : <span className="truncate">{t(leaf.key)}</span>}
    </Link>
  );
}

/** A collapsible group: header button (icon + label + chevron) over indented leaves. */
function NavGroupBlock({
  group,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  collapsed: boolean;
  onNavigate?: () => void;
}): JSX.Element | null {
  const t = useTranslations('nav');
  const { can } = usePermissions();
  const { expandedGroups, toggleGroup } = useSidebar();

  // Hide the whole group when the role can read none of its leaves.
  const visible = group.leaves.filter((leaf) => !leaf.permission || can(leaf.permission));
  if (visible.length === 0 || !group.id || !group.key) {
    return null;
  }
  const open = expandedGroups.has(group.id);
  const Icon = group.icon;

  return (
    <div className="mb-0.5 first:mt-0">
      <button
        type="button"
        onClick={() => toggleGroup(group.id as string)}
        aria-expanded={open}
        title={collapsed ? t(group.key) : undefined}
        className={cn(
          'mt-2.5 flex w-full items-center gap-2.5 rounded-lg py-2.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700',
          collapsed ? 'justify-center px-0' : 'px-2.5',
        )}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden /> : null}
        {collapsed ? null : (
          <>
            <span className="flex-1 text-left">{t(group.key)}</span>
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform',
                open && 'rotate-90',
              )}
              aria-hidden
            />
          </>
        )}
      </button>

      {!collapsed && open ? (
        <div className="mt-0.5 flex flex-col gap-px">
          {visible.map((leaf) =>
            leaf.permission ? (
              <ProtectedAction key={leaf.key} permission={leaf.permission}>
                <NavLink leaf={leaf} onNavigate={onNavigate} />
              </ProtectedAction>
            ) : (
              <NavLink key={leaf.key} leaf={leaf} onNavigate={onNavigate} />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Sidebar navigation (hi-fi spec §App Shell): a standalone Dashboard leaf plus
 * collapsible, permission-filtered groups. `collapsed` renders the 64px icon rail.
 */
export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}): JSX.Element {
  return (
    <nav
      className={cn('flex flex-col gap-0.5 py-3.5 pb-7', collapsed ? 'px-2' : 'px-3')}
      aria-label="Navigasi utama"
    >
      {NAV_GROUPS.map((group, i) => {
        // The key-less single-leaf group is the standalone Dashboard item.
        if (!group.key) {
          const leaf = group.leaves[0];
          return leaf ? (
            <NavTop key="dashboard" leaf={leaf} collapsed={collapsed} onNavigate={onNavigate} />
          ) : null;
        }
        return (
          <NavGroupBlock
            key={group.id ?? `group-${i}`}
            group={group}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
