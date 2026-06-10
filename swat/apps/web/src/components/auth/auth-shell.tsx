'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/cn';

/**
 * Two-column auth scaffold. Left (lg+ only): SWAT brand lockup, product intro
 * with feature bullets, and a hero illustration on an emerald panel — the
 * `primary-700 → primary-900` fill is mode-stable (those ramp steps don't invert
 * in `.dark`), with literal `text-white` so it stays legible in both themes.
 * Right: the theme toggle, a mobile-only brand lockup (the left panel is hidden
 * below `lg`), the page heading (title/subtitle), the form card (children), and
 * an optional footer. Shared by login, change-password, and forgot-password.
 */
export function AuthShell({
  title,
  subtitle,
  illustration,
  footer,
  width = 400,
  children,
}: {
  title: string;
  subtitle: string;
  illustration?: { name: IllustrationName; size?: number };
  footer?: string;
  width?: 400 | 440;
  children: ReactNode;
}): JSX.Element {
  const t = useTranslations('authIntro');
  const features = [t('feature1'), t('feature2'), t('feature3')];

  return (
    <main className="relative min-h-screen bg-neutral-50 lg:grid lg:grid-cols-2">
      <div className="absolute right-[18px] top-[18px] z-20">
        <ThemeToggle />
      </div>

      {/* Left brand/intro panel — desktop only. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgb(255_255_255_/_0.10),transparent_55%)]"
        />

        <div className="relative flex items-center gap-3">
          <span className="h-11 w-11 overflow-hidden rounded-[12px] shadow-base">
            <BrandMark />
          </span>
          <span>
            <span className="block text-[19px] font-bold tracking-[-0.01em] text-white">SWAT</span>
            <span className="block text-[12px] text-white/70">{t('org')}</span>
          </span>
        </div>

        <div className="relative">
          <Illustration
            name={illustration?.name ?? 'login'}
            size={illustration?.size ?? 232}
            className="mb-8"
          />
          <h2 className="max-w-[22ch] text-[26px] font-bold leading-tight tracking-[-0.01em] text-white">
            {t('heading')}
          </h2>
          <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/80">
            {t('tagline')}
          </p>
          <ul className="mt-7 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-[13.5px] text-white/90">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="h-3.5 w-3.5 text-white" aria-hidden />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11.5px] text-white/60">{footer ?? t('org')}</p>
      </aside>

      {/* Right form panel. */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className={cn('w-full', width === 440 ? 'max-w-[440px]' : 'max-w-[400px]')}>
          {/* Mobile-only brand lockup (the left panel is hidden below lg). */}
          <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
            <span className="h-14 w-14 overflow-hidden rounded-[14px] shadow-base">
              <BrandMark />
            </span>
            <b className="text-[18px] font-bold tracking-[-0.01em] text-neutral-900">SWAT</b>
          </div>

          <div className="mb-5">
            <h1 className="text-[22px] font-bold tracking-[-0.01em] text-neutral-900">{title}</h1>
            <p className="mt-1 text-[13px] text-neutral-500">{subtitle}</p>
          </div>

          {children}

          {footer ? (
            <p className="mt-6 text-center text-[11.5px] text-neutral-400 lg:hidden">{footer}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
