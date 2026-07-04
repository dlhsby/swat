'use client';

import { useTranslations } from 'next-intl';

import { type Locale, locales } from '@/i18n/config';

import { SegmentedControl } from './segmented-control';

/** Human label per locale; the segmented control shows these. */
const LOCALE_LABELS: Record<Locale, string> = {
  'id-ID': 'Bahasa Indonesia',
  'en-US': 'English',
};

export interface LanguageControlProps {
  readonly value: Locale;
  readonly onChange: (next: Locale) => void;
}

/**
 * Language picker. Presentational (controlled): the parent holds the staged locale
 * and navigates to it on Save (so an accidental tap doesn't switch language).
 */
export function LanguageControl({ value, onChange }: LanguageControlProps): JSX.Element {
  const t = useTranslations('settings');
  return (
    <SegmentedControl<Locale>
      ariaLabel={t('language')}
      value={value}
      onChange={onChange}
      options={locales.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
    />
  );
}
