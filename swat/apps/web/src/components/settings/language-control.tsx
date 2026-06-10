'use client';

import { useLocale, useTranslations } from 'next-intl';

import { type Locale, locales } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

import { SegmentedControl } from './segmented-control';

/** Human label per locale; the segmented control shows these. */
const LOCALE_LABELS: Record<Locale, string> = {
  'id-ID': 'Bahasa Indonesia',
  'en-US': 'English',
};

/** Language picker — switches the active locale while preserving the route. */
export function LanguageControl(): JSX.Element {
  const t = useTranslations('settings');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (next: Locale): void => {
    if (next !== locale) {
      router.replace(pathname, { locale: next });
    }
  };

  return (
    <SegmentedControl<Locale>
      ariaLabel={t('language')}
      value={locale}
      onChange={onChange}
      options={locales.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
    />
  );
}
