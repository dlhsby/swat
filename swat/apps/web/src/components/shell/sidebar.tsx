'use client';

import { useTranslations } from 'next-intl';

import { ProtectedAction } from '@/components/auth/protected-action';
import { usePermissions } from '@/hooks/use-permissions';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { type NavGroup, type NavLeaf, NAV_GROUPS } from '@/lib/nav';

function NavLink({ leaf, onNavigate }: { leaf: NavLeaf; onNavigate?: () => void }): JSX.Element {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const Icon = leaf.icon;
  const active = pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);

  if (leaf.comingSoon) {
    return (
      <span
        className="flex cursor-default items-center gap-2.5 rounded-base px-3 py-2 text-[13px] text-neutral-400"
        aria-disabled
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">{t(leaf.key)}</span>
        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
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
        'flex items-center gap-2.5 rounded-base px-3 py-2 text-[13px] transition-colors',
        active
          ? 'border-l-[3px] border-primary-600 bg-primary-50 pl-2 font-semibold text-primary-700'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{t(leaf.key)}</span>
    </Link>
  );
}

function NavGroupBlock({
  group,
  onNavigate,
}: {
  group: NavGroup;
  onNavigate?: () => void;
}): JSX.Element | null {
  const t = useTranslations('nav');
  const { can } = usePermissions();
  // Hide the whole group when the role can read none of its leaves.
  const visible = group.leaves.filter((leaf) => !leaf.permission || can(leaf.permission));
  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0.5">
      {group.key ? (
        <p className="px-3 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400">
          {t(group.key)}
        </p>
      ) : null}
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
  );
}

/** Sidebar navigation (hi-fi spec §App Shell). Role-driven visibility. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-3" aria-label="Navigasi utama">
      {NAV_GROUPS.map((group, i) => (
        <NavGroupBlock key={group.key ?? `group-${i}`} group={group} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
