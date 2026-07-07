'use client';

import { useTranslations } from 'next-intl';

import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, Skeleton } from '@/components/ui';
import { useSiteDaySummary } from '@/hooks/use-monitoring';
import { formatDateDisplay, formatNumber, formatTonnage } from '@/lib/format';
import { kgToTon } from '@/lib/monitoring-charts';

/** The site a map marker click selected, captured so the sheet keeps its title. */
export interface SelectedSite {
  readonly id: string;
  readonly name: string;
  readonly type: string;
}

/**
 * Map drill-down for one site on a given day. A TPS shows what was picked up there
 * (per-vehicle rit + tonase); a TPA shows the tonase disposed there. Reuses the
 * `sites/:id/day-summary` endpoint.
 */
export function SiteDetailSheet({
  site,
  date,
  onOpenChange,
}: {
  site: SelectedSite | null;
  date: string;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const t = useTranslations('dashboard');
  const query = useSiteDaySummary(site?.id ?? null, date);
  const summary = query.data;
  const isTpa = site?.type === 'TPA';
  const vehicles = summary?.vehicles ?? [];

  return (
    <Sheet open={site !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(94vw,480px)]">
        <SheetHeader>
          <SheetTitle>{site?.name ?? ''}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-6">
          <p className="text-body-sm text-neutral-500">
            {site?.type} · {formatDateDisplay(date)}
          </p>

          {query.isLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-tiny text-neutral-500">{t('siteTonnage')}</p>
                  <p className="mt-1 text-h3 font-semibold tabular-nums text-neutral-900">
                    {formatTonnage(kgToTon(summary?.tonnageKg ?? 0))}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-tiny text-neutral-500">
                    {isTpa ? t('siteDisposals') : t('sitePickups')}
                  </p>
                  <p className="mt-1 text-h3 font-semibold tabular-nums text-neutral-900">
                    {formatNumber(summary?.tripCount ?? 0)}
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-label font-semibold text-neutral-700">{t('siteByVehicle')}</h3>
                {vehicles.length === 0 ? (
                  <p className="text-body-sm text-neutral-500">{t('emptyTable')}</p>
                ) : (
                  <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
                    {vehicles.map((v) => (
                      <li
                        key={v.plateNumber}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <span className="font-mono text-body-sm text-neutral-900">
                          {v.plateNumber}
                        </span>
                        <span className="flex items-center gap-4 text-body-sm text-neutral-500">
                          <span className="tabular-nums">
                            {formatTonnage(kgToTon(v.tonnageKg))}
                          </span>
                          <span className="tabular-nums">
                            {formatNumber(v.rit)} {t('ritUnit')}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
