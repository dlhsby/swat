'use client';

import { useQuery } from '@tanstack/react-query';

import {
  type DateRange,
  type SourceGroup,
  type TimeBucket,
  type TripQuery,
  monitoringApi,
} from '@/lib/monitoring-api';

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

export function useTonnageMonthly(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'tonnage-monthly', range],
    queryFn: () => monitoringApi.tonnageMonthly(range),
  });
}

export function useTonnageBySite(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'tonnage-by-site', range],
    queryFn: () => monitoringApi.tonnageBySite(range),
  });
}

export function useFuelConsumption(range: DateRange, vehicleId?: string) {
  return useQuery({
    queryKey: [KEY, 'fuel-consumption', range, vehicleId ?? 'ALL'],
    queryFn: () => monitoringApi.fuelConsumption(range, vehicleId),
  });
}

export function useFuelByType(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'fuel-by-type', range],
    queryFn: () => monitoringApi.fuelByType(range),
  });
}

export function useRoutesActive(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'routes-active', range],
    queryFn: () => monitoringApi.routesActive(range),
  });
}

export function useRouteMap(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'route-map', range],
    queryFn: () => monitoringApi.routeMap(range),
  });
}

export function useTripSummary(range: DateRange, query: TripQuery = {}) {
  return useQuery({
    queryKey: [KEY, 'trip-summary', range, query],
    queryFn: () => monitoringApi.tripSummary(range, query),
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

// ── Dashboard revamp ────────────────────────────────────────────────────────

export function useDayStats(date: string) {
  return useQuery({
    queryKey: [KEY, 'day-stats', date],
    queryFn: () => monitoringApi.dayStats(date),
  });
}

export function useTonnageDestination(range: DateRange, bucket: TimeBucket) {
  return useQuery({
    queryKey: [KEY, 'tonnage-destination', range, bucket],
    queryFn: () => monitoringApi.tonnageDestination(range, bucket),
  });
}

export function useTonnageByTps(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'tonnage-by-tps', range],
    queryFn: () => monitoringApi.tonnageByTps(range),
  });
}

export function useTonnageByVehicle(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'tonnage-by-vehicle', range],
    queryFn: () => monitoringApi.tonnageByVehicle(range),
  });
}

export function useFuelTrend(range: DateRange, bucket: TimeBucket) {
  return useQuery({
    queryKey: [KEY, 'fuel-trend', range, bucket],
    queryFn: () => monitoringApi.fuelTrend(range, bucket),
  });
}

export function useFuelDetail(range: DateRange) {
  return useQuery({
    queryKey: [KEY, 'fuel-detail', range],
    queryFn: () => monitoringApi.fuelDetail(range),
  });
}

export function useSiteDaySummary(siteId: string | null, date: string) {
  return useQuery({
    queryKey: [KEY, 'site-day-summary', siteId, date],
    queryFn: () => monitoringApi.siteDaySummary(siteId as string, date),
    enabled: siteId !== null,
  });
}
