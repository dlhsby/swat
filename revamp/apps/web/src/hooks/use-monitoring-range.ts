'use client';

import { useState } from 'react';

import { todayWIB } from '@/lib/dates';
import { type DateRange } from '@/lib/monitoring-api';
import { type PresetKey, datePresets } from '@/lib/monitoring-charts';

/**
 * Owns the dashboard date range. Defaults to today ("Latest") — the picker opens
 * on the most recent data — and exposes a setter the DateRangeControl drives.
 * Pass a different `initialPreset` for dashboards whose data is monthly (e.g.
 * Retribusi → `ytd`), where a single-day window would usually be empty.
 */
export function useMonitoringRange(initialPreset: PresetKey = 'today'): {
  range: DateRange;
  setRange: (range: DateRange) => void;
  today: string;
} {
  const [today] = useState(() => todayWIB());
  const [range, setRange] = useState<DateRange>(() => {
    const { dateFrom, dateTo } = datePresets(today)[initialPreset];
    return { dateFrom, dateTo };
  });
  return { range, setRange, today };
}
