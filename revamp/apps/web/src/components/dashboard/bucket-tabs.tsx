'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { type DateRange, type TimeBucket } from '@/lib/monitoring-api';

/**
 * The harian / bulanan / tahunan trend tabs shared by the tonase + BBM charts.
 * A picked day anchors each window: harian = the trailing 30 days, bulanan = the
 * trailing 12 months, tahunan = the trailing 5 years — all ending at the picked
 * date. Kept UTC-anchored (operationDate is a `@db.Date`) to avoid tz drift.
 */
/** Parse a `YYYY-MM-DD` key into a numeric `[year, month, day]` tuple. */
function ymd(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split('-');
  return [Number(y), Number(m), Number(d)];
}

export function bucketRange(dateKey: string, bucket: TimeBucket): DateRange {
  const [y, m, d] = ymd(dateKey);
  const iso = (date: Date): string => date.toISOString().slice(0, 10);
  if (bucket === 'month') {
    return { dateFrom: iso(new Date(Date.UTC(y, m - 1 - 11, 1))), dateTo: dateKey };
  }
  if (bucket === 'year') {
    return { dateFrom: iso(new Date(Date.UTC(y - 4, 0, 1))), dateTo: dateKey };
  }
  return { dateFrom: iso(new Date(Date.UTC(y, m - 1, d - 29))), dateTo: dateKey };
}

/** Format a bucket-start ISO date into an axis label appropriate to the bucket. */
export function bucketLabel(bucket: TimeBucket, iso: string): string {
  const [y, m, d] = ymd(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (bucket === 'year') return String(y);
  if (bucket === 'month') {
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

/** State hook: the active bucket + its resolved date window for a picked day. */
export function useBucketTabs(dateKey: string): {
  bucket: TimeBucket;
  setBucket: (bucket: TimeBucket) => void;
  range: DateRange;
} {
  const [bucket, setBucket] = useState<TimeBucket>('day');
  const range = useMemo(() => bucketRange(dateKey, bucket), [dateKey, bucket]);
  return { bucket, setBucket, range };
}

/** Segmented control rendering the three bucket tabs (harian/bulanan/tahunan). */
export function BucketTabs({
  bucket,
  onBucket,
}: {
  bucket: TimeBucket;
  onBucket: (bucket: TimeBucket) => void;
}): JSX.Element {
  const t = useTranslations('dashboard');
  return (
    <Tabs value={bucket} onValueChange={(v) => onBucket(v as TimeBucket)}>
      <TabsList>
        <TabsTrigger value="day">{t('bucketDaily')}</TabsTrigger>
        <TabsTrigger value="month">{t('bucketMonthly')}</TabsTrigger>
        <TabsTrigger value="year">{t('bucketYearly')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
