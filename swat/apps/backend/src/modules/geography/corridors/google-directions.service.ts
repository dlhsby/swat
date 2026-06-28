import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../../config/config.service';

interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/** Decode a Google-encoded polyline into `[lat, lng]` pairs. */
function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/**
 * Server-side Google Directions snapping (Phase 7.8). Used to snap a route's
 * auto-default corridor to actual roads. Needs a NON-referrer-restricted server key
 * (`GOOGLE_MAPS_SERVER_KEY`); when unset or on any failure it returns null so the
 * caller falls back to a straight line — snapping is best-effort, never blocking.
 */
@Injectable()
export class GoogleDirectionsService {
  private readonly logger = new Logger(GoogleDirectionsService.name);

  constructor(private readonly config: AppConfigService) {}

  /** Road-following driving route between two points as GeoJSON `[lng, lat]` pairs. */
  async snapDrivingRoute(origin: LatLng, dest: LatLng): Promise<Array<[number, number]> | null> {
    const key = this.config.googleMapsServerKey;
    if (!key) {
      return null;
    }
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin.lat},${origin.lng}` +
      `&destination=${dest.lat},${dest.lng}&mode=driving&key=${key}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`Directions snap HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        status?: string;
        routes?: Array<{ overview_polyline?: { points?: string } }>;
      };
      const points = data.routes?.[0]?.overview_polyline?.points;
      if (data.status !== 'OK' || !points) {
        this.logger.warn(`Directions snap failed (${data.status ?? 'no route'})`);
        return null;
      }
      const decoded = decodePolyline(points);
      if (decoded.length < 2) {
        return null;
      }
      return decoded.map(([lat, lng]): [number, number] => [lng, lat]);
    } catch (err) {
      this.logger.warn(`Directions snap error: ${String(err)}`);
      return null;
    }
  }
}
