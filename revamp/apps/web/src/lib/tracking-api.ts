import { apiClient } from './api-client';

export interface VehiclePosition {
  readonly vehicleId: string;
  readonly plate: string;
  readonly source: 'live-gps' | 'recorded-activity';
  readonly status: 'online' | 'offline' | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly asOf: string;
  readonly speedKmh: number | null;
  readonly heading: number | null;
  readonly legLabel: string | null;
}

export interface TrackPoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly heading: number | null;
  readonly recordedAt: string;
}

export interface DeviationAlert {
  readonly id: string;
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly tripId: string | null;
  readonly alertType: string;
  readonly severity: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceM: number | null;
  readonly pingCount: number;
  readonly isAcknowledged: boolean;
  readonly acknowledgedAt: string | null;
  readonly resolvedAt: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export interface AlertFilter {
  readonly vehicleId?: string;
  readonly acknowledged?: boolean;
  readonly resolved?: boolean;
}

function alertQuery(filter: AlertFilter): string {
  const params = new URLSearchParams({ limit: '100' });
  if (filter.vehicleId) params.set('vehicleId', filter.vehicleId);
  if (filter.acknowledged !== undefined) params.set('acknowledged', String(filter.acknowledged));
  if (filter.resolved !== undefined) params.set('resolved', String(filter.resolved));
  return params.toString();
}

export interface EfficiencyRow {
  readonly date: string;
  readonly vehicleId: string;
  readonly plate: string;
  readonly positionSource: string;
  readonly plannedMeters: number;
  readonly actualMeters: number;
  readonly adherencePct: number | null;
  readonly dwellMinutes: number | null;
  readonly lateMinutes: number;
  readonly wastedFuelLiters: number;
  readonly gpsidFuelLiters: number | null;
  readonly deviationCount: number;
}

export interface EfficiencyDashboard {
  readonly kpis: {
    readonly adherencePct: number | null;
    readonly wastedFuelLiters: number;
    readonly gpsidFuelLiters: number | null;
    readonly lateMinutes: number;
    readonly deviationCount: number;
    readonly distanceKm: number;
    readonly gpsCoverageRate: number;
    readonly deviceOnline: number;
    readonly deviceOffline: number;
    readonly deviceOfflineRate: number;
  };
  readonly rows: EfficiencyRow[];
}

export type DeviationType =
  | 'off_corridor'
  | 'off_sequence'
  | 'dwell_too_long'
  | 'late_to_schedule';
export type DeviationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/** A tunable deviation rule (Phase 7). `threshold` is metres or seconds per type. */
export interface DeviationRule {
  readonly deviationType: DeviationType;
  readonly threshold: number | null;
  readonly hysteresisSec: number;
  readonly severity: DeviationSeverity;
  readonly enabled: boolean;
}

export interface UpsertDeviationRuleBody {
  readonly threshold?: number;
  readonly hysteresisSec?: number;
  readonly severity?: DeviationSeverity;
  readonly enabled?: boolean;
}

/** Phase 7 GPS tracking API — fleet positions, breadcrumb track, deviation alerts + rules. */
export const trackingApi = {
  efficiency: (from: string, to: string): Promise<EfficiencyDashboard> =>
    apiClient.get(`/monitoring/efficiency?from=${from}&to=${to}`),
  positions: (): Promise<VehiclePosition[]> => apiClient.get('/monitoring/fleet-positions'),
  track: (vehicleId: string, minutes = 60): Promise<TrackPoint[]> =>
    apiClient.get(`/gps/vehicles/${vehicleId}/track?minutes=${minutes}`),
  alerts: (filter: AlertFilter = {}): Promise<DeviationAlert[]> =>
    apiClient.get(`/gps/alerts?${alertQuery(filter)}`),
  acknowledge: (id: string, notes?: string): Promise<DeviationAlert> =>
    apiClient.patch(`/gps/alerts/${id}/acknowledge`, notes ? { notes } : {}),
  deviationRules: (): Promise<DeviationRule[]> => apiClient.get('/gps/deviation-rules'),
  upsertDeviationRule: (type: DeviationType, body: UpsertDeviationRuleBody): Promise<DeviationRule> =>
    apiClient.put(`/gps/deviation-rules/${type}`, { ...body }),
};
