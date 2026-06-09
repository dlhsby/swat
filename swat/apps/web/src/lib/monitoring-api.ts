import { apiClient } from './api-client';

/**
 * Typed client for the Phase-2 monitoring API (backend Epic 2.2). Every endpoint
 * takes an inclusive `dateFrom`/`dateTo` window and returns rollup-backed data;
 * the apiClient unwraps the response envelope to the bare payload.
 */

export type ReconciliationStatus = 'MATCHED' | 'DISCREPANCY' | 'PENDING';
export type FuelVarianceFlag = 'OK' | 'RED';
export type Ownership = 'DINAS' | 'SWASTA';

export interface DateRange {
  readonly dateFrom: string;
  readonly dateTo: string;
}

export interface DailyTonnageRow {
  readonly date: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
  readonly tpaInboundKg: number | null;
  readonly reconciliationStatus: ReconciliationStatus;
}

export interface TonnageBySourceRow {
  readonly wasteSourceId: number;
  readonly code: string;
  readonly name: string;
  readonly ownership: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface TonnageBySiteRow {
  readonly siteId: number;
  readonly name: string;
  readonly type: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface FuelConsumptionRow {
  readonly vehicleId: number;
  readonly plateNumber: string;
  readonly fuelApprovedLiters: number;
  readonly fuelRequestedLiters: number;
  readonly variancePercent: number;
  readonly flag: FuelVarianceFlag;
}

export interface RouteActivityRow {
  readonly routeId: number;
  readonly category: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
  readonly distanceKm: number;
  readonly tripCount: number;
}

export interface LevySummaryRow {
  readonly categoryName: string;
  readonly totalAmount: number;
  readonly transactionCount: number;
  readonly avgPerTransaction: number;
}

export interface KpiOverview {
  readonly totalTonnageKg: number;
  readonly haulsCompleted: number;
  readonly fuelApprovedLiters: number;
  readonly fuelRequestedLiters: number;
  readonly vehiclesInOperation: number;
  readonly tripsRecorded: number;
  readonly routesActive: number;
}

/** Build a `?dateFrom=…&dateTo=…&extra=…` query string, omitting empty params. */
export function monitoringQuery(
  range: DateRange,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams({ dateFrom: range.dateFrom, dateTo: range.dateTo });
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  }
  return params.toString();
}

export const monitoringApi = {
  tonnage5Day: (range: DateRange): Promise<DailyTonnageRow[]> =>
    apiClient.get(`/monitoring/tonnage-5day?${monitoringQuery(range)}`),

  tonnageBySource: (range: DateRange, ownership?: Ownership): Promise<TonnageBySourceRow[]> =>
    apiClient.get(`/monitoring/tonnage-by-source?${monitoringQuery(range, { ownership })}`),

  tonnageBySite: (range: DateRange): Promise<TonnageBySiteRow[]> =>
    apiClient.get(`/monitoring/tonnage-by-site?${monitoringQuery(range)}`),

  fuelConsumption: (range: DateRange): Promise<FuelConsumptionRow[]> =>
    apiClient.get(`/monitoring/fuel-consumption?${monitoringQuery(range)}`),

  routesActive: (range: DateRange): Promise<RouteActivityRow[]> =>
    apiClient.get(`/monitoring/routes-active?${monitoringQuery(range)}`),

  levySummary: (range: DateRange): Promise<LevySummaryRow[]> =>
    apiClient.get(`/monitoring/levy-summary?${monitoringQuery(range)}`),

  kpiOverview: (range: DateRange): Promise<KpiOverview> =>
    apiClient.get(`/monitoring/kpi-overview?${monitoringQuery(range)}`),
};
