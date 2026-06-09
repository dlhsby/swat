/**
 * Monitoring API response shapes (Phase 2, Epic 2.2). All tonnage is kilograms,
 * fuel is litres, levy is integer IDR. Served from the rollup tables + Redis
 * cache so any date range — including archived years — stays under a second.
 */

export type ReconciliationStatus = 'MATCHED' | 'DISCREPANCY' | 'PENDING';
export type FuelVarianceFlag = 'OK' | 'RED';

export interface DailyTonnageRow {
  readonly date: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
  readonly tpaInboundKg: number | null;
  readonly reconciliationStatus: ReconciliationStatus;
}

export interface MonthlyTonnageRow {
  readonly month: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface TonnageBySourceRow {
  readonly wasteSourceId: number;
  readonly code: string;
  readonly name: string;
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

export interface FuelByTypeRow {
  readonly fuelId: number;
  readonly fuelName: string;
  readonly totalApprovedLiters: number;
  readonly totalRequestedLiters: number;
}

export interface RouteActivityRow {
  readonly routeId: number;
  readonly category: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
  readonly distanceKm: number;
  readonly tripCount: number;
}

export interface TripSummaryRow {
  readonly id: string;
  readonly operationDate: string;
  readonly name: string;
  readonly status: string;
  readonly routeId: number | null;
  readonly netWeightKg: number | null;
  readonly plateNumber: string;
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
