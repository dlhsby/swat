/**
 * Minimal GeoJSON LineString validation for corridor geometry (Phase 7). Keeps
 * the contract explicit (≥2 positions, valid lng/lat ranges) with a clear message
 * BEFORE PostGIS sees it — PostGIS would also reject malformed input, but with an
 * opaque error. Returns the typed LineString or throws a plain Error the service
 * maps to a 422.
 */
export interface GeoJsonLineString {
  readonly type: 'LineString';
  readonly coordinates: Array<[number, number]>;
}

export class InvalidGeometryError extends Error {}

export function assertLineString(value: unknown): GeoJsonLineString {
  if (typeof value !== 'object' || value === null) {
    throw new InvalidGeometryError('Geometri harus berupa objek GeoJSON LineString.');
  }
  const geo = value as { type?: unknown; coordinates?: unknown };
  if (geo.type !== 'LineString') {
    throw new InvalidGeometryError('Geometri harus bertipe LineString.');
  }
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length < 2) {
    throw new InvalidGeometryError('Koridor harus memiliki minimal 2 titik.');
  }
  for (const pair of geo.coordinates) {
    if (
      !Array.isArray(pair) ||
      pair.length < 2 ||
      typeof pair[0] !== 'number' ||
      typeof pair[1] !== 'number' ||
      pair[0] < -180 ||
      pair[0] > 180 ||
      pair[1] < -90 ||
      pair[1] > 90
    ) {
      throw new InvalidGeometryError('Titik koordinat tidak valid ([lng, lat]).');
    }
  }
  return { type: 'LineString', coordinates: geo.coordinates as Array<[number, number]> };
}
