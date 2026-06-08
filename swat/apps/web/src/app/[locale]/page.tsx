import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Illustration } from '@/components/illustrations/Illustration';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function HomePage() {
  const t = useTranslations('home');
  const common = useTranslations('common');

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-xl px-lg py-2xl text-center">
      <div className="absolute right-lg top-lg">
        <ThemeToggle />
      </div>
      <Illustration name="success" size={160} />
      <div className="space-y-sm">
        <h1 className="text-h1 text-foreground">{t('title')}</h1>
        <p className="text-body text-muted-foreground">{t('subtitle')}</p>
      </div>
      <p className="font-mono text-body-sm text-primary-700 dark:text-primary-300">
        {common('appTagline')}
      </p>
      <Link
        href="/health"
        className="rounded-base bg-primary px-lg py-sm text-label text-primary-foreground shadow-sm transition-colors hover:bg-primary-800"
      >
        {t('healthLink')}
      </Link>
    </main>
  );
}
