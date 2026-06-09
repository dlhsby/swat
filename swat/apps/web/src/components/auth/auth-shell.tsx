'use client';

import { type ReactNode } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/cn';

/**
 * Centered auth scaffold (hi-fi `.hf-auth`): emerald glow background, theme
 * toggle, brand lockup (optional hero illustration + mark + title/subtitle),
 * the form card (children), and a footer line. Shared by login + change-password.
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
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-6 py-10">
      {/* Faint emerald glow from the top center. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(5_150_105_/_0.06),transparent_55%)]"
      />
      <div className="absolute right-[18px] top-[18px] z-10">
        <ThemeToggle />
      </div>

      <div className={cn('relative w-full', width === 440 ? 'max-w-[440px]' : 'max-w-[400px]')}>
        <div className="mb-6 flex flex-col items-center gap-3">
          {illustration ? (
            <Illustration
              name={illustration.name}
              size={illustration.size ?? 232}
              className="mx-auto -mb-0.5"
            />
          ) : null}
          <span className="h-14 w-14 overflow-hidden rounded-[14px] shadow-base">
            <BrandMark />
          </span>
          <b className="text-[20px] font-bold tracking-[-0.01em] text-neutral-900">{title}</b>
          <span className="text-center text-[12.5px] text-neutral-500">{subtitle}</span>
        </div>

        {children}

        {footer ? (
          <p className="mt-5 text-center text-[11.5px] text-neutral-400">{footer}</p>
        ) : null}
      </div>
    </main>
  );
}
