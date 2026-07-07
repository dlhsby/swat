'use client';

import { FuelIcon, type LucideIcon, MapPin, Ticket, Weight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent } from '@/components/ui';
import { Link } from '@/i18n/navigation';

/** A deep-link tile into one of the four monitoring domains. */
function DomainLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-base border border-neutral-200 px-4 py-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-base bg-primary-50 text-primary-700">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 text-body-sm font-medium text-neutral-900">{label}</span>
      <span className="text-body-sm font-medium text-primary-700">→</span>
    </Link>
  );
}

/** The "Buka Pemantauan" grid of deep links into the full monitoring domains. */
export function OpenMonitoring(): JSX.Element {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 text-label font-medium text-neutral-500">{t('openMonitoring')}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DomainLink href="/monitoring/volume" icon={Weight} label={tNav('volume')} />
          <DomainLink href="/monitoring/fuel" icon={FuelIcon} label={tNav('fuelMonitoring')} />
          <DomainLink href="/monitoring/hauling" icon={MapPin} label={tNav('hauling')} />
          <DomainLink href="/monitoring/levy" icon={Ticket} label={tNav('levy')} />
        </div>
      </CardContent>
    </Card>
  );
}
