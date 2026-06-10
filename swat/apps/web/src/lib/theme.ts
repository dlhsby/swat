/**
 * Theme controller. Persists the user's choice to localStorage('swat-theme'),
 * applies `.dark` on <html>, and keeps the browser `theme-color` meta in sync.
 * The pre-paint script in the root layout reads the same key to avoid a flash.
 */
export type Theme = 'light' | 'dark';
/** User-facing preference: `system` follows the OS, otherwise an explicit theme. */
export type ThemePreference = 'system' | Theme;

const STORAGE_KEY = 'swat-theme';
const THEME_COLOR_LIGHT = '#f8fafc';
const THEME_COLOR_DARK = '#0f172a';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Resolve the active theme: stored choice wins, else the system preference. */
export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }
}

export function setTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
}

/** The stored preference, defaulting to `system` when nothing is persisted. */
export function getThemePreference(): ThemePreference {
  return getStoredTheme() ?? 'system';
}

/**
 * Persist a theme preference and apply it immediately. `system` clears the
 * stored override so the OS preference (and future changes to it) win.
 */
export function setThemePreference(preference: ThemePreference): void {
  if (typeof window !== 'undefined') {
    if (preference === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  }
  applyTheme(preference === 'system' ? getSystemTheme() : preference);
}

export function toggleTheme(): Theme {
  const next: Theme = resolveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Inline script (string) injected in <head> before paint. Reads the stored
 * theme (or system preference) and sets `.dark` so there is no flash on reload.
 */
export const PRE_PAINT_THEME_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
