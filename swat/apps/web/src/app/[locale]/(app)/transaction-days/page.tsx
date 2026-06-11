'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { PageHead } from '@/components/shell/page-head';
import {
  Alert,
  Button,
  Card,
  CardContent,
  DatePicker,
  Label,
  Skeleton,
  StatusPill,
  notify,
} from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { deriveDayMetrics } from '@/lib/dashboard';
import { todayWIB } from '@/lib/dates';
import { formatDateDisplay, formatNumber, formatTonnage } from '@/lib/format';
import { getTransactionDayByDate, initializeToday } from '@/lib/transactions-api';
import { type TransactionDayDto } from '@/lib/types/transactions';

export default function TransactionDaysPage(): JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const [date, setDate] = useState(todayWIB());
  const [day, setDay] = useState<TransactionDayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const load = useCallback(async (target: string): Promise<void> => {
    setLoading(true);
    setNotFound(false);
    try {
      setDay(await getTransactionDayByDate(target));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDay(null);
        setNotFound(true);
      } else {
        notify.error(err instanceof ApiError ? err.message : 'Gagal memuat hari transaksi.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const onInitialize = async (): Promise<void> => {
    setInitializing(true);
    try {
      const result = await initializeToday();
      notify.success(
        result.created
          ? `Hari transaksi dibuat: ${result.hauls} haul, ${result.trips} rute.`
          : 'Hari transaksi hari ini sudah ada.',
      );
      setDate(todayWIB());
      await load(todayWIB());
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menginisiasi hari.');
    } finally {
      setInitializing(false);
    }
  };

  const metrics = deriveDayMetrics(day);

  return (
    <>
      <PageHead
        title={t('transactionDays')}
        actions={
          <ProtectedAction permission="transaction-day:manage">
            <Button onClick={() => void onInitialize()} loading={initializing}>
              Inisiasi Hari Ini
            </Button>
          </ProtectedAction>
        }
      />

      <Alert variant="info" className="mb-4">
        Inisiasi Hari membuat hari transaksi dan menurunkan Haul + penugasan dari jadwal kru aktif.
        Operasi ini idempoten — menjalankan ulang untuk tanggal yang sama tidak menggandakan data.
      </Alert>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48 space-y-1.5">
              <Label>Tanggal</Label>
              <DatePicker value={date} onValueChange={(v) => v && setDate(v)} />
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-16" />
          ) : notFound ? (
            <p className="py-6 text-center text-body-sm text-neutral-500">
              Belum ada hari transaksi untuk {formatDateDisplay(date)}.
            </p>
          ) : day ? (
            <button
              type="button"
              onClick={() => router.push(`/transaction-days/${day.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-body-sm text-neutral-900">
                  {formatDateDisplay(day.date)}
                </span>
                <StatusPill domain="day" value={day.status} />
              </div>
              <div className="flex items-center gap-4 text-body-sm text-neutral-500">
                <span>{formatNumber(metrics.activeVehicles)} kendaraan</span>
                <span className="tabular-nums">{formatTonnage(metrics.tonnage)}</span>
                <span className="flex items-center gap-1 font-medium text-primary-700">
                  Lihat Board <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </button>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
