/**
 * Google Maps configuration (Phase 7). The browser key ships to the client, so it
 * MUST be restricted by HTTP referrer + enabled APIs in the Google console. When
 * unset, map components fall back to a "peta belum dikonfigurasi" placeholder so
 * dev/CI builds work without a key. Snap-to-roads is intentionally NOT done here —
 * it uses a server-proxied key (kept off the client) via the backend.
 */
export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const isMapsConfigured = Boolean(MAPS_API_KEY);

/** Default map view — Surabaya city centre (before bounds fit to data). */
export const SURABAYA = { lat: -7.2575, lng: 112.7521 } as const;
