import { type Metadata, type Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { type ReactNode } from 'react';

import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { isLocale } from '@/i18n/config';
import { routing } from '@/i18n/routing';
import { PRE_PAINT_THEME_SCRIPT } from '@/lib/theme';

import '../globals.css';

export const metadata: Metadata = {
  title: 'SWAT — DLH Surabaya',
  description: 'Sistem Pengangkutan Sampah Terpadu — Dinas Lingkungan Hidup Kota Surabaya',
  manifest: '/manifest.json',
  applicationName: 'SWAT',
  appleWebApp: { capable: true, title: 'SWAT', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Pre-paint theme to avoid a flash of the wrong theme on reload. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_THEME_SCRIPT }} />
        {/* Load brand fonts at runtime (no build-time network dependency). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
