'use client';

import { useEffect, useState } from 'react';

import { cachedMapsApiKey, MAPS_API_KEY, resolveMapsApiKey } from '@/lib/google-maps';

/**
 * Resolve the browser Google Maps key. Returns the build-time key immediately when
 * present; otherwise `undefined` while it resolves from `/config/public`, then the
 * runtime key string or `null` when unconfigured. Map components show a loading
 * placeholder for `undefined` and the "belum dikonfigurasi" notice for `null`.
 */
export function useMapsApiKey(): string | null | undefined {
  const [key, setKey] = useState<string | null | undefined>(MAPS_API_KEY);

  useEffect(() => {
    if (MAPS_API_KEY) return undefined; // build-time key — nothing to resolve
    const cached = cachedMapsApiKey();
    if (cached) {
      setKey(cached);
      return undefined;
    }
    let active = true;
    void resolveMapsApiKey().then((k) => {
      if (active) setKey(k);
    });
    return () => {
      active = false;
    };
  }, []);

  return key;
}
