'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { resolveTheme, type Theme, toggleTheme } from '@/lib/theme';

/** Light/dark theme switch. Hydration-safe: reads the resolved theme on mount. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(resolveTheme());
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      aria-label="Ganti Tema"
      onClick={() => setThemeState(toggleTheme())}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-base border border-border bg-card text-foreground transition-colors hover:bg-muted',
        className,
      )}
    >
      {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
