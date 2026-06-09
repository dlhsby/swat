'use client';

import { Bell, ChevronDown, KeyRound, LogOut, Menu, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';
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

/** Topbar (hi-fi spec §App Shell) — brand lockup, theme toggle, notifications, user menu. */
export function Topbar(): JSX.Element {
  const t = useTranslations('shell');
  const { user, logout } = useAuth();
  const { setOpen } = useSidebar();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="z-sticky flex h-[76px] shrink-0 items-center gap-4 border-b border-neutral-200 bg-neutral-0 px-4 shadow-[0_1px_0_var(--neutral-200),0_6px_16px_-10px_rgb(15_23_42_/_0.22)] sm:px-6">
      {/* Mobile drawer trigger (< lg). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('openMenu')}
        className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[9px] text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/* Brand lockup. */}
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[10px] shadow-subtle">
          <BrandMark />
        </span>
        <span className="leading-none">
          <b className="block text-[17px] font-bold leading-[1.1] tracking-[-0.01em] text-neutral-900">
            SWAT
          </b>
          <span className="text-[12.5px] text-neutral-500">· DLH Surabaya</span>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <button
          type="button"
          aria-label={t('notifications')}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-base text-neutral-600 transition-colors hover:bg-neutral-100"
        >
          <Bell className="h-[19px] w-[19px]" aria-hidden />
          <span
            className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-neutral-0 bg-danger-500"
            aria-hidden
          />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('userMenu')}
            className="flex items-center gap-[11px] rounded-[11px] py-[5px] pl-[5px] pr-2.5 transition-colors hover:bg-neutral-100"
          >
            <Avatar className="h-[38px] w-[38px] text-[14px]">
              <AvatarFallback>{initialsOf(user?.name ?? '?')}</AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-[1.25] md:block">
              <span className="block text-[14px] font-semibold text-neutral-900">{user?.name}</span>
              <span className="block text-[12px] text-neutral-500">{user?.roleName}</span>
            </span>
            <ChevronDown
              className="hidden h-[15px] w-[15px] text-neutral-400 md:block"
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <UserCircle aria-hidden />
              {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/change-password')}>
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
