import { type CorridorWaypoint, type GeoJsonLineString } from './geometry-api';
import { type RouteCategoryValue } from './master-api';
import { makeResourceApi } from './resource-api';

/** A named, reusable corridor (Phase 7.8). Mirrors the backend `/corridors` DTO. */
export interface CorridorDto {
  id: string;
  name: string;
  category: RouteCategoryValue | null;
  originSiteId: string | null;
  originSiteName: string | null;
  destinationSiteId: string | null;
  destinationSiteName: string | null;
  pathGeojson: GeoJsonLineString;
  waypoints: CorridorWaypoint[] | null;
  toleranceMeters: number;
  lengthMeters: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export const corridorsApi = makeResourceApi<CorridorDto>('/corridors');

/** Build a `?origin=&destination=&category=` filter for the corridor picker. */
export function corridorLegQuery(params: {
  originSiteId?: string | null;
  destinationSiteId?: string | null;
  category?: RouteCategoryValue | null;
}): string {
  const q = new URLSearchParams();
  if (params.originSiteId) q.set('originSiteId', params.originSiteId);
  if (params.destinationSiteId) q.set('destinationSiteId', params.destinationSiteId);
  if (params.category) q.set('category', params.category);
  const s = q.toString();
  return s ? `?${s}` : '';
}
