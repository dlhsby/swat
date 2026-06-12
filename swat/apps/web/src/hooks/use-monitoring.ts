'use client';

import { useQuery } from '@tanstack/react-query';

import { type DateRange, type SourceGroup, monitoringApi } from '@/lib/monitoring-api';

/**
 * TanStack Query hooks for the monitoring dashboards. Query keys are namespaced
 * by endpoint + range (+ source group) so a date-range change refetches precisely;
 * the provider's 15-minute staleTime mirrors the server cache TTL.
 */

const KEY = 'monitoring';

export function useKpiOverview(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'kpi-overview', range],
    queryFn: () => monitoringApi.kpiOverview(range),
  });
}

export function useTonnage5Day(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'tonnage-5day', range],
    queryFn: () => monitoringApi.tonnage5Day(range),
  });
}

export function useTonnageBySource(range: DateRange, group?: SourceGroup) {
  return useQuery({
    queryKey: [KEY, 'tonnage-by-source', range, group ?? 'ALL'],
    queryFn: () => monitoringApi.tonnageBySource(range, group),
  });
}

export function useTonnageBySite(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'tonnage-by-site', range],
    queryFn: () => monitoringApi.tonnageBySite(range),
  });
}

export function useFuelConsumption(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'fuel-consumption', range],
    queryFn: () => monitoringApi.fuelConsumption(range),
  });
}

export function useRoutesActive(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'routes-active', range],
    queryFn: () => monitoringApi.routesActive(range),
  });
}

export function useLevySummary(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'levy-summary', range],
    queryFn: () => monitoringApi.levySummary(range),
  });
}

export function useLevyTrend(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'levy-trend', range],
    queryFn: () => monitoringApi.levyTrend(range),
  });
}
