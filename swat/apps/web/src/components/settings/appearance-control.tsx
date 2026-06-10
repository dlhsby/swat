'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/theme';

import { SegmentedControl } from './segmented-control';

/** Appearance picker — System / Light / Dark, persisted via the theme controller. */
export function AppearanceControl(): JSX.Element {
  const t = useTranslations('settings');
  const [pref, setPref] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  // Resolve the stored preference on mount to stay hydration-safe.
  useEffect(() => {
    setPref(getThemePreference());
    setMounted(true);
  }, []);

  const onChange = (next: ThemePreference): void => {
    setPref(next);
    setThemePreference(next);
  };

  return (
    <SegmentedControl<ThemePreference>
      ariaLabel={t('appearance')}
      value={mounted ? pref : 'system'}
      onChange={onChange}
      options={[
        {
          value: 'system',
          label: t('themeSystem'),
          icon: <Monitor className="h-4 w-4" aria-hidden />,
        },
        { value: 'light', label: t('themeLight'), icon: <Sun className="h-4 w-4" aria-hidden /> },
        { value: 'dark', label: t('themeDark'), icon: <Moon className="h-4 w-4" aria-hidden /> },
      ]}
    />
  );
}
