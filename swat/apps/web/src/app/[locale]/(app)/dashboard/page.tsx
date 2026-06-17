'use client';

import { Fuel, Gauge, Scale, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import {
  Alert,
  Button,
  Card,
  CardContent,
  MetricCard,
  Skeleton,
  StatusPill,
  notify,
} from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { deriveDayMetrics } from '@/lib/dashboard';
import { todayWIB } from '@/lib/dates';
import { formatDateDisplay, formatFuel, formatNumber, formatTonnage } from '@/lib/format';
import { getTransactionDayByDate, initializeToday } from '@/lib/transactions-api';
import { type TransactionDayDto } from '@/lib/types/transactions';
import { useAuth } from '@/providers/auth-provider';

function greetingKey():
  | 'greetingMorning'
  | 'greetingAfternoon'
  | 'greetingEvening'
  | 'greetingNight' {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 11) return 'greetingMorning';
  if (hour < 15) return 'greetingAfternoon';
  if (hour < 18) return 'greetingEvening';
  return 'greetingNight';
}

export default function DashboardPage(): JSX.Element {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const router = useRouter();

  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await getTransactionDayByDate(todayWIB());
      setDay(result);
    } catch (err) {
      // 404 = no day initialized yet; anything else is a real error.
      if (!(err instanceof ApiError) || err.status !== 404) {
        notify.error(err instanceof ApiError ? err.message : 'Gagal memuat data.');
      }
      setDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onInitialize = async (): Promise<void> => {
    setInitializing(true);
    try {
      const result = await initializeToday();
      notify.success(
        result.created
          ? t('initDayCreated', {
              hauls: result.hauls,
              assignments: result.assignments,
              trips: result.trips,
            })
          : t('initDayExists'),
      );
      await load();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal membuat jadwal hari ini.');
    } finally {
      setInitializing(false);
    }
  };

  const metrics = deriveDayMetrics(day);

  return (
    <>
      <PageHead
        title={`${t(greetingKey())}, ${user?.name ?? ''}`.trim()}
        description={`${formatDateDisplay(todayWIB())} · ${t('subtitle')}`}
        actions={
          <ProtectedAction permission="transaction-day:manage">
            <Button onClick={() => void onInitialize()} loading={initializing}>
              {t('initDay')}
            </Button>
          </ProtectedAction>
        }
      />

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <MetricCard
              icon={Truck}
              label={t('metricActiveVehicles')}
              value={formatNumber(metrics.activeVehicles)}
              unit={t('unitVehicles')}
            />
            <MetricCard
              icon={Gauge}
              label={t('metricRunningHauls')}
              value={formatNumber(metrics.runningHauls)}
              unit={t('unitHauls')}
            />
            <MetricCard
              icon={Fuel}
              label={t('metricFuelToday')}
              value={formatFuel(metrics.fuelLiters).replace(' L', '')}
              unit={t('unitLiters')}
            />
            <MetricCard
              icon={Scale}
              label={t('metricTonnageToday')}
              value={formatTonnage(metrics.tonnage).replace(' ton', '')}
              unit={t('unitTon')}
            />
          </>
        )}
      </div>

      {/* Recent day + attention */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="mb-3 text-h3 font-semibold text-neutral-900">{t('recentDays')}</h2>
            {loading ? (
              <Skeleton className="h-16" />
            ) : day ? (
              <button
                type="button"
                onClick={() => router.push(`/scheduling/${day.id}`)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-base border border-neutral-200 px-4 py-3 text-left transition-colors hover:bg-neutral-50',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-body-sm text-neutral-900">
                    {formatDateDisplay(day.date)}
                  </span>
                  <StatusPill domain="day" value={day.status} />
                </div>
                <div className="flex items-center gap-4 text-body-sm text-neutral-500">
                  <span>
                    {formatNumber(metrics.activeVehicles)} {t('colVehicles').toLowerCase()}
                  </span>
                  <span className="tabular-nums">{formatTonnage(metrics.tonnage)}</span>
                  <span className="font-medium text-primary-700">{t('viewBoard')} →</span>
                </div>
              </button>
            ) : (
              <p className="py-6 text-center text-body-sm text-neutral-500">{t('emptyDays')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-h3 font-semibold text-neutral-900">{t('attention')}</h2>
            {loading ? (
              <Skeleton className="h-16" />
            ) : metrics.awaitingVerification === 0 && metrics.runningHauls === 0 ? (
              <Alert variant="success">{t('attentionNone')}</Alert>
            ) : (
              <div className="space-y-2">
                {metrics.awaitingVerification > 0 ? (
                  <Alert variant="warning">
                    {metrics.awaitingVerification} rute menunggu verifikasi.
                  </Alert>
                ) : null}
                {metrics.runningHauls > 0 ? (
                  <Alert variant="info">{metrics.runningHauls} angkut sampah masih berjalan.</Alert>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
