'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type ThemePreference } from '@/lib/theme';

import { SegmentedControl } from './segmented-control';

export interface AppearanceControlProps {
  readonly value: ThemePreference;
  readonly onChange: (next: ThemePreference) => void;
}

/**
 * Appearance picker — System / Light / Dark. Presentational (controlled): the parent
 * holds the staged value and applies/persists it on Save.
 */
export function AppearanceControl({ value, onChange }: AppearanceControlProps): JSX.Element {
  const t = useTranslations('settings');
  return (
    <SegmentedControl<ThemePreference>
      ariaLabel={t('appearance')}
      value={value}
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
