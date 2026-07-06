import { apiClient } from './api-client';
import { type CorridorWaypoint, type GeoJsonLineString } from './geometry-api';

/** A drawn path owned by a route (Phase 7.8). Mirrors the backend Corridor DTO. */
export interface CorridorDto {
  id: string;
  routeId: string;
  name: string;
  isDefault: boolean;
  pathGeojson: GeoJsonLineString;
  waypoints: CorridorWaypoint[] | null;
  toleranceMeters: number;
  lengthMeters: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCorridorBody {
  name: string;
  pathGeojson: GeoJsonLineString;
  waypoints?: CorridorWaypoint[];
  toleranceMeters?: number;
}

/** Route-scoped corridor CRUD: a route owns 1..N corridors (default first). */
export const corridorApi = {
  listForRoute: (routeId: string): Promise<CorridorDto[]> =>
    apiClient.get<CorridorDto[]>(`/routes/${routeId}/corridors`),
  create: (routeId: string, body: UpsertCorridorBody): Promise<CorridorDto> =>
    apiClient.post<CorridorDto>(`/routes/${routeId}/corridors`, { ...body }),
  update: (id: string, body: Partial<UpsertCorridorBody>): Promise<CorridorDto> =>
    apiClient.patch<CorridorDto>(`/corridors/${id}`, { ...body }),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/corridors/${id}`),
  /** On-demand "Buat koridor default" — idempotent; null if sites still lack coords. */
  backfillDefault: (routeId: string): Promise<CorridorDto | null> =>
    apiClient.post<CorridorDto | null>(`/routes/${routeId}/corridors/backfill`, {}),
  /** Preview the route's default geometry (endpoints + road-snapped mid-points) WITHOUT
   *  saving — seeds the editor's "build from route" action. Null if sites lack coords. */
  previewDefault: (routeId: string): Promise<CorridorSeed | null> =>
    apiClient.post<CorridorSeed | null>(`/routes/${routeId}/corridors/preview-default`, {}),
};

/** Non-persisted default-corridor geometry returned by {@link corridorApi.previewDefault}. */
export interface CorridorSeed {
  pathGeojson: GeoJsonLineString;
  waypoints: CorridorWaypoint[];
}
