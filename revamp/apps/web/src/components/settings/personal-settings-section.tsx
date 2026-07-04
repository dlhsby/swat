'use client';

import { Info, Languages, type LucideIcon, Palette } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Card, CardContent, notify } from '@/components/ui';
import { type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { APP_VERSION } from '@/lib/app-meta';
import { updatePreferences } from '@/lib/auth-api';
import { getThemePreference, setThemePreference, type ThemePreference } from '@/lib/theme';

import { AppearanceControl } from './appearance-control';
import { LanguageControl } from './language-control';
import { SettingsNavButton } from './settings-nav-button';
import { SettingsSaveBar } from './settings-save-bar';

type PersonalGroupId = 'appearance' | 'language' | 'about';

const NAV: readonly { id: PersonalGroupId; icon: LucideIcon }[] = [
  { id: 'appearance', icon: Palette },
  { id: 'language', icon: Languages },
  { id: 'about', icon: Info },
];

/**
 * Personal preferences as a master/detail (same two-column layout as the system
 * settings tab). Appearance + language STAGE and apply only on Save, so an accidental
 * tap can't flip the theme or switch language. Cancel reverts to the current values.
 */
export function PersonalSettingsSection(): JSX.Element {
  const t = useTranslations('settings');
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [savedTheme, setSavedTheme] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<PersonalGroupId>('appearance');

  useEffect(() => {
    const stored = getThemePreference();
    setSavedTheme(stored);
    setTheme(stored);
    setMounted(true);
  }, []);

  const themeDirty = mounted && theme !== savedTheme;
  const localeDirty = locale !== currentLocale;
  const dirty = themeDirty || localeDirty;

  const onSave = async (): Promise<void> => {
    setSaving(true);
    try {
      if (theme !== savedTheme) setThemePreference(theme); // localStorage + DOM
      await updatePreferences({ theme, locale }).catch(() => undefined); // best-effort persist
      setSavedTheme(theme);
      notify.success(t('saved'));
      if (locale !== currentLocale) router.replace(pathname, { locale }); // navigates last
    } finally {
      setSaving(false);
    }
  };

  const onCancel = (): void => {
    setTheme(savedTheme);
    setLocale(currentLocale);
  };

  const LABEL: Record<PersonalGroupId, string> = {
    appearance: t('appearance'),
    language: t('language'),
    about: t('about'),
  };
  const HELP: Record<PersonalGroupId, string> = {
    appearance: t('appearanceBody'),
    language: t('languageBody'),
    about: t('aboutBody'),
  };
  const isDirty: Record<PersonalGroupId, boolean> = {
    appearance: themeDirty,
    language: localeDirty,
    about: false,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sub-menu rail */}
        <nav
          aria-label="Kelompok preferensi"
          className="h-fit overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0"
        >
          {NAV.map((g) => (
            <SettingsNavButton
              key={g.id}
              icon={g.icon}
              label={LABEL[g.id]}
              help={HELP[g.id]}
              active={selected === g.id}
              right={
                isDirty[g.id] ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                ) : undefined
              }
              onSelect={() => setSelected(g.id)}
            />
          ))}
        </nav>

        {/* Detail */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-body-lg font-semibold text-neutral-900">{LABEL[selected]}</h3>
              <p className="text-body-sm text-neutral-500">{HELP[selected]}</p>
            </div>

            {selected === 'appearance' ? (
              <AppearanceControl value={mounted ? theme : 'system'} onChange={setTheme} />
            ) : null}

            {selected === 'language' ? (
              <LanguageControl value={locale} onChange={setLocale} />
            ) : null}

            {selected === 'about' ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-label text-neutral-500">{t('aboutApp')}</dt>
                  <dd className="mt-0.5 text-body text-neutral-900">SWAT</dd>
                </div>
                <div>
                  <dt className="text-label text-neutral-500">{t('aboutOrg')}</dt>
                  <dd className="mt-0.5 text-body text-neutral-900">DLH Kota Surabaya</dd>
                </div>
                <div>
                  <dt className="text-label text-neutral-500">{t('aboutVersion')}</dt>
                  <dd className="mt-0.5 font-mono text-body text-neutral-900">{APP_VERSION}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <SettingsSaveBar
        visible
        dirty={dirty}
        message={dirty ? t('unsaved') : t('noChanges')}
        saving={saving}
        onCancel={onCancel}
        onSave={() => void onSave()}
        saveLabel={t('saveChanges')}
        cancelLabel={t('cancel')}
      />
    </div>
  );
}
