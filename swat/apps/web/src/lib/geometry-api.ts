import { apiClient } from './api-client';

/** A GeoJSON LineString position is `[lng, lat]` (GeoJSON order). */
export type GeoPosition = [number, number];

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: GeoPosition[];
}

/**
 * A corridor editor control point: `snapped` means the segment leading INTO it
 * follows roads (Google Directions); `false` is a freehand (straight) segment.
 */
export interface CorridorWaypoint {
  lng: number;
  lat: number;
  snapped: boolean;
}

export interface RouteGeometryDto {
  routeId: string;
  pathGeojson: GeoJsonLineString;
  waypoints: CorridorWaypoint[] | null;
  toleranceMeters: number;
  lengthMeters: number;
  source: string;
  updatedAt: string;
}

export interface TripGeometryDto {
  tripId: string;
  pathGeojson: GeoJsonLineString | null;
  waypoints: CorridorWaypoint[] | null;
  toleranceMeters: number | null;
}

export interface DeviationRuleDto {
  deviationType: string;
  threshold: number | null;
  hysteresisSec: number;
  severity: string;
  enabled: boolean;
}

interface UpsertGeometryBody {
  pathGeojson: GeoJsonLineString;
  waypoints?: CorridorWaypoint[];
  toleranceMeters?: number;
}

/**
 * Route corridor geometry + deviation-rule API (Phase 7). Mirrors the backend
 * `/gps/routes/:id/geometry`, `/gps/trips/:id/geometry`, and `/gps/deviation-rules`
 * endpoints. GET route geometry returns null when no corridor is drawn yet.
 */
/** apiClient bodies are typed as `Record<string, unknown>`; our typed payloads
 * are structurally compatible — this narrows without leaking `any`. */
const asBody = (value: object): Record<string, unknown> => value as Record<string, unknown>;

export const geometryApi = {
  getRouteGeometry: (routeId: string): Promise<RouteGeometryDto | null> =>
    apiClient.get(`/gps/routes/${routeId}/geometry`),
  saveRouteGeometry: (routeId: string, body: UpsertGeometryBody): Promise<RouteGeometryDto> =>
    apiClient.put(`/gps/routes/${routeId}/geometry`, asBody(body)),
  deleteRouteGeometry: (routeId: string): Promise<{ message: string }> =>
    apiClient.delete(`/gps/routes/${routeId}/geometry`),

  getTripGeometry: (tripId: string): Promise<TripGeometryDto> =>
    apiClient.get(`/gps/trips/${tripId}/geometry`),
  saveTripGeometry: (tripId: string, body: UpsertGeometryBody): Promise<TripGeometryDto> =>
    apiClient.put(`/gps/trips/${tripId}/geometry`, asBody(body)),
  deleteTripGeometry: (tripId: string): Promise<{ message: string }> =>
    apiClient.delete(`/gps/trips/${tripId}/geometry`),

  listDeviationRules: (): Promise<DeviationRuleDto[]> => apiClient.get(`/gps/deviation-rules`),
  saveDeviationRule: (
    type: string,
    body: Partial<Omit<DeviationRuleDto, 'deviationType'>>,
  ): Promise<DeviationRuleDto> => apiClient.put(`/gps/deviation-rules/${type}`, asBody(body)),
};
