'use client';

import { useLocale } from 'next-intl';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import { type CurrentUser, fetchMe, logout as logoutRequest } from '@/lib/auth-api';
import { setThemePreference, type ThemePreference } from '@/lib/theme';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const LOCALES = ['id-ID', 'en-US'];

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: CurrentUser | null;
  /** Re-fetch `/auth/me` (after login or password change). */
  readonly refresh: () => Promise<CurrentUser | null>;
  /** Clear the server session and local state. */
  readonly logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const localeHydrated = useRef(false);

  const refresh = useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const me = await fetchMe();
      setUser(me);
      setStatus('authenticated');
      // Hydrate personal prefs from the DB (source of truth): apply the saved theme to
      // this device's localStorage cache, and restore the saved language once.
      const theme = me.preferences?.theme;
      if (theme && (THEMES as readonly string[]).includes(theme)) {
        setThemePreference(theme as ThemePreference);
      }
      const savedLocale = me.preferences?.locale;
      if (!localeHydrated.current && savedLocale && LOCALES.includes(savedLocale) && savedLocale !== locale) {
        localeHydrated.current = true;
        router.replace(pathname, { locale: savedLocale });
      }
      return me;
    } catch {
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, [locale, router, pathname]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, refresh, logout }),
    [status, user, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}
