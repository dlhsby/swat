'use client';

import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentType } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { mailtoLink, SUPPORT_CONTACT, telLink, whatsappLink } from '@/lib/support-contact';

interface Channel {
  key: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

export default function ForgotPasswordPage(): JSX.Element {
  const t = useTranslations('forgotPassword');

  // Only render channels that are actually configured.
  const channels: Channel[] = [
    SUPPORT_CONTACT.whatsapp && {
      key: 'whatsapp',
      icon: MessageCircle,
      label: t('whatsapp'),
      value: SUPPORT_CONTACT.whatsapp,
      href: whatsappLink(SUPPORT_CONTACT.whatsapp),
      external: true,
    },
    SUPPORT_CONTACT.email && {
      key: 'email',
      icon: Mail,
      label: t('email'),
      value: SUPPORT_CONTACT.email,
      href: mailtoLink(SUPPORT_CONTACT.email, t('emailSubject')),
    },
    SUPPORT_CONTACT.phone && {
      key: 'phone',
      icon: Phone,
      label: t('phone'),
      value: SUPPORT_CONTACT.phone,
      href: telLink(SUPPORT_CONTACT.phone),
    },
  ].filter(Boolean) as Channel[];

  return (
    <AuthShell width={440} title={t('title')} subtitle={t('subtitle')}>
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-base">
        <p className="text-body-sm text-neutral-600">{t('body')}</p>

        {channels.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <li key={channel.key}>
                  <a
                    href={channel.href}
                    {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-primary-50 text-primary-700 dark:text-primary-400">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-neutral-500">
                        {channel.label}
                      </span>
                      <span className="block truncate font-medium text-neutral-900">
                        {channel.value}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-body-sm text-neutral-500">{t('noChannels')}</p>
        )}

        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('backToLogin')}
        </Link>
      </div>
    </AuthShell>
  );
}
