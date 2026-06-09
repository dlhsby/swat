'use client';

import { useState } from 'react';

import { todayWIB } from '@/lib/dates';
import { type DateRange } from '@/lib/monitoring-api';
import { datePresets } from '@/lib/monitoring-charts';

/**
 * Owns the dashboard date range. Defaults to the last 7 days (WIB) — the common
 * "recent activity" view — and exposes a setter the DateRangeControl drives.
 */
export function useMonitoringRange(): {
  range: DateRange;
  setRange: (range: DateRange) => void;
  today: string;
} {
  const [today] = useState(() => todayWIB());
  const [range, setRange] = useState<DateRange>(() => {
    const { dateFrom, dateTo } = datePresets(today).last7;
    return { dateFrom, dateTo };
  });
  return { range, setRange, today };
}
