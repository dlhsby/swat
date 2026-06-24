import { apiClient } from './api-client';

/**
 * Typed client for the Phase-2 monitoring API (backend Epic 2.2). Every endpoint
 * takes an inclusive `dateFrom`/`dateTo` window and returns rollup-backed data;
 * the apiClient unwraps the response envelope to the bare payload.
 */

export type ReconciliationStatus = 'MATCHED' | 'DISCREPANCY' | 'PENDING';
export type FuelVarianceFlag = 'OK' | 'RED';
/** Legacy Semua / Non-Swasta / Swasta tonnage filter (omit for Semua). */
export type SourceGroup = 'NON_SWASTA' | 'SWASTA';

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

export interface MonthlyTonnageRow {
  /** Calendar month as `YYYY-MM`. */
  readonly month: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface TonnageBySourceRow {
  readonly wasteSourceId: string;
  readonly code: string;
  readonly name: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface TonnageBySiteRow {
  readonly siteId: string;
  readonly name: string;
  readonly type: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface FuelConsumptionRow {
  readonly vehicleId: string;
  readonly plateNumber: string;
  readonly fuelApprovedLiters: number;
  readonly fuelRequestedLiters: number;
  readonly variancePercent: number;
  readonly flag: FuelVarianceFlag;
}

export interface FuelByTypeRow {
  readonly fuelId: string;
  readonly fuelName: string;
  readonly totalApprovedLiters: number;
  readonly totalRequestedLiters: number;
}

export interface RouteActivityRow {
  readonly routeId: string;
  readonly category: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
  readonly distanceKm: number;
  readonly tripCount: number;
}

/** One operational trip row for the Pengangkutan table (crew + KM/time realisasi). */
export interface TripSummaryRow {
  readonly id: string;
  readonly operationDate: string;
  readonly name: string;
  readonly status: string;
  readonly routeId: string | null;
  readonly routeName: string | null;
  readonly netWeightKg: number | null;
  readonly plateNumber: string;
  readonly driverName: string;
  readonly targetOdometer: number;
  readonly actualOdometer: number;
  readonly targetTime: string | null;
  readonly actualTime: string | null;
  readonly fuelApprovedLiters: number | null;
  readonly fuelRequestedLiters: number | null;
}

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface RouteMapSite {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface RouteMapEdge {
  readonly routeId: string;
  readonly category: string;
  readonly originSiteId: string;
  readonly destinationSiteId: string;
  readonly tripCount: number;
}

export interface RouteMapResponse {
  readonly sites: RouteMapSite[];
  readonly edges: RouteMapEdge[];
}

/** Optional filters for the operational trip query. */
export interface TripQuery {
  readonly status?: string;
  readonly vehicleId?: string;
  readonly driverId?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface LevySummaryRow {
  readonly categoryName: string;
  readonly totalAmount: number;
  readonly transactionCount: number;
  readonly avgPerTransaction: number;
}

export interface LevyTrendRow {
  /** Calendar month as `YYYY-MM`. */
  readonly month: string;
  readonly totalAmount: number;
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

  tonnageBySource: (range: DateRange, group?: SourceGroup): Promise<TonnageBySourceRow[]> =>
    apiClient.get(`/monitoring/tonnage-by-source?${monitoringQuery(range, { group })}`),

  tonnageMonthly: (range: DateRange): Promise<MonthlyTonnageRow[]> =>
    apiClient.get(`/monitoring/tonnage-monthly?${monitoringQuery(range)}`),

  tonnageBySite: (range: DateRange): Promise<TonnageBySiteRow[]> =>
    apiClient.get(`/monitoring/tonnage-by-site?${monitoringQuery(range)}`),

  fuelConsumption: (range: DateRange, vehicleId?: string): Promise<FuelConsumptionRow[]> =>
    apiClient.get(`/monitoring/fuel-consumption?${monitoringQuery(range, { vehicleId })}`),

  fuelByType: (range: DateRange): Promise<FuelByTypeRow[]> =>
    apiClient.get(`/monitoring/fuel-by-type?${monitoringQuery(range)}`),

  routesActive: (range: DateRange): Promise<RouteActivityRow[]> =>
    apiClient.get(`/monitoring/routes-active?${monitoringQuery(range)}`),

  routeMap: (range: DateRange): Promise<RouteMapResponse> =>
    apiClient.get(`/monitoring/route-map?${monitoringQuery(range)}`),

  tripSummary: (
    range: DateRange,
    query: TripQuery = {},
  ): Promise<{ data: TripSummaryRow[]; meta: PaginationMeta }> =>
    apiClient.get(
      `/monitoring/trip-summary?${monitoringQuery(range, {
        status: query.status,
        vehicleId: query.vehicleId,
        driverId: query.driverId,
        page: String(query.page ?? 1),
        limit: String(query.limit ?? 100),
      })}`,
    ),

  levySummary: (range: DateRange): Promise<LevySummaryRow[]> =>
    apiClient.get(`/monitoring/levy-summary?${monitoringQuery(range)}`),

  levyTrend: (range: DateRange): Promise<LevyTrendRow[]> =>
    apiClient.get(`/monitoring/levy-trend?${monitoringQuery(range)}`),

  kpiOverview: (range: DateRange): Promise<KpiOverview> =>
    apiClient.get(`/monitoring/kpi-overview?${monitoringQuery(range)}`),
};
