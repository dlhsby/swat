'use client';

import { Bell, ChevronDown, KeyRound, LogOut, Menu, Recycle, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useSidebar } from '@/components/shell/sidebar-context';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Avatar,
  AvatarFallback,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { initialsOf } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

/** Topbar (hi-fi spec §App Shell) — brand, theme toggle, notifications, user menu. */
export function Topbar(): JSX.Element {
  const t = useTranslations('shell');
  const tc = useTranslations('common');
  const { user, logout } = useAuth();
  const { setOpen } = useSidebar();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="flex h-[76px] items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-0 px-4 shadow-subtle sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('openMenu')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-base text-neutral-600 hover:bg-neutral-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-700 text-white"
            aria-hidden
          >
            <Recycle className="h-5 w-5" />
          </span>
          <span className="hidden text-body font-semibold text-neutral-900 sm:inline">
            {tc('appOrg')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <button
          type="button"
          aria-label={t('notifications')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-base text-neutral-600 hover:bg-neutral-100"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('userMenu')}
            className="flex items-center gap-2 rounded-base p-1 hover:bg-neutral-100"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initialsOf(user?.name ?? '?')}</AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight md:block">
              <span className="block text-body-sm font-semibold text-neutral-900">
                {user?.name}
              </span>
              <span className="block text-tiny text-neutral-500">{user?.roleName}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-neutral-400 md:block" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profil')}>
              <UserCircle aria-hidden />
              {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/ubah-kata-sandi')}>
              <KeyRound aria-hidden />
              {t('changePassword')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setConfirmLogout(true)}>
              <LogOut aria-hidden />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title={t('logoutConfirmTitle')}
        description={t('logoutConfirmBody')}
        confirmLabel={t('logout')}
        onConfirm={() => void onLogout()}
      />
    </header>
  );
}
