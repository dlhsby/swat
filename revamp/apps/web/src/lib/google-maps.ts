/**
 * Google Maps configuration (Phase 7). The browser key ships to the client, so it
 * MUST be restricted by HTTP referrer + enabled APIs in the Google console. When
 * unset, map components fall back to a "peta belum dikonfigurasi" placeholder so
 * dev/CI builds work without a key. Snap-to-road in the corridor editor uses this
 * same browser key via the Maps JS Directions service — enable the "Directions API"
 * (and "Geocoding API" for the Lokasi pin search) on the key alongside Maps JS.
 */
import { apiClient } from './api-client';

/** Build-time key (primary). If unset, the key is fetched at runtime from the admin
 *  settings via GET /config/public. */
export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Whether a build-time key is present. Runtime resolution may still find one. */
export const isMapsConfigured = Boolean(MAPS_API_KEY);

const RUNTIME_CACHE_KEY = 'swat-maps-browser-key';
let inflight: Promise<string | null> | null = null;

/**
 * Resolve the browser Maps key: the build-time env key if set, otherwise the
 * runtime key configured in admin settings (GET /config/public), cached in a module
 * promise + localStorage so the map loads without a flash on subsequent mounts.
 */
export async function resolveMapsApiKey(): Promise<string | null> {
  if (MAPS_API_KEY) return MAPS_API_KEY;
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await apiClient.get<{ maps: { browserKey: string | null } }>('/config/public');
        const key = res.maps.browserKey ?? null;
        if (typeof window !== 'undefined') {
          if (key) window.localStorage.setItem(RUNTIME_CACHE_KEY, key);
          else window.localStorage.removeItem(RUNTIME_CACHE_KEY);
        }
        return key;
      } catch {
        return null;
      }
    })();
  }
  return inflight;
}

/** The last runtime key we cached in localStorage (for a flash-free first paint). */
export function cachedMapsApiKey(): string | null {
  if (MAPS_API_KEY) return MAPS_API_KEY;
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(RUNTIME_CACHE_KEY);
}

/** Default map view — Surabaya city centre (before bounds fit to data). */
export const SURABAYA = { lat: -7.2575, lng: 112.7521 } as const;
