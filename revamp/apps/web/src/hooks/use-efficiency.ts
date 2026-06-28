'use client';

import { useQuery } from '@tanstack/react-query';

import { type DateRange } from '@/lib/monitoring-api';
import { trackingApi } from '@/lib/tracking-api';

/** Fleet efficiency dashboard for a date range (Phase 7, T-721). */
export function useEfficiency(range: DateRange) {
  return useQuery({
    queryKey: ['gps-efficiency', range],
    queryFn: () => trackingApi.efficiency(range.dateFrom, range.dateTo),
  });
}
