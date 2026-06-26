'use client';

import { APIProvider, Map as GoogleMap, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPinned, Search, Crosshair } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Input } from '@/components/ui';
import { isMapsConfigured, MAPS_API_KEY, SURABAYA } from '@/lib/google-maps';

export type LatLng = google.maps.LatLngLiteral;

/** Round to 6 decimal places — matches the DB `Decimal(11,6)` lat/lng precision. */
export const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * Imperative single-pin layer: click the map to place the pin, drag it to move.
 * Mirrors the corridor-editor pattern (core `google.maps` API — no Map ID needed).
 * Recenters once when an initial value is present (edit), then leaves the viewport
 * to the user so dragging/searching doesn't fight the camera.
 */
function PinLayer({
  value,
  onPick,
  onMapReady,
}: {
  value: LatLng | null;
  onPick: (p: LatLng) => void;
  onMapReady: (map: google.maps.Map) => void;
}): null {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const centeredRef = useRef(false);

  useEffect(() => {
    if (map) onMapReady(map);
  }, [map, onMapReady]);

  // Click anywhere to (re)place the pin.
  useEffect(() => {
    if (!map) return undefined;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onPick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => listener.remove();
  }, [map, onPick]);

  // Marker mirrors `value`; created lazily, dragged updates flow back up.
  useEffect(() => {
    if (!map || typeof google === 'undefined') return undefined;
    if (!value) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return undefined;
    }
    if (!markerRef.current) {
      const marker = new google.maps.Marker({ map, position: value, draggable: true });
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onPick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setPosition(value);
    }
    return undefined;
  }, [map, value, onPick]);

  // Center on the initial value exactly once (e.g. opening an existing site).
  useEffect(() => {
    if (map && value && !centeredRef.current) {
      map.panTo(value);
      map.setZoom(15);
      centeredRef.current = true;
    }
  }, [map, value]);

  return null;
}

function MapPickerInner({
  value,
  onChange,
  height,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height: number;
}): JSX.Element {
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (geocodingLib) geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const runSearch = useCallback(async () => {
    const geocoder = geocoderRef.current;
    const term = query.trim();
    if (!geocoder || term.length === 0) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { results } = await geocoder.geocode({ address: term });
      const hit = results[0];
      if (!hit) {
        setSearchError('Alamat tidak ditemukan.');
        return;
      }
      const loc = hit.geometry.location;
      const picked = { lat: round6(loc.lat()), lng: round6(loc.lng()) };
      onChange(picked);
      mapRef.current?.panTo(picked);
      mapRef.current?.setZoom(16);
    } catch {
      setSearchError('Pencarian alamat gagal. Coba lagi.');
    } finally {
      setSearching(false);
    }
  }, [query, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void runSearch();
            }
          }}
          placeholder="Cari alamat untuk memindahkan pin…"
          aria-label="Cari alamat"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void runSearch()}
          loading={searching}
          aria-label="Cari"
        >
          <Search className="h-4 w-4" aria-hidden /> Cari
        </Button>
      </div>
      {searchError ? <p className="text-tiny text-danger-600">{searchError}</p> : null}
      <div className="overflow-hidden rounded-base border border-neutral-200" style={{ height }}>
        <GoogleMap
          defaultCenter={value ?? SURABAYA}
          defaultZoom={value ? 15 : 12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
        >
          <PinLayer value={value} onPick={onChange} onMapReady={onMapReady} />
        </GoogleMap>
      </div>
      <p className="flex items-center gap-1.5 text-tiny text-neutral-500">
        <Crosshair className="h-3.5 w-3.5" aria-hidden />
        Klik peta atau seret pin untuk menetapkan titik.
      </p>
    </div>
  );
}

/**
 * Reusable single-pin map picker. Presentational: holds no form state — the caller
 * owns `value` (or `null` for "no pin yet") and receives every move via `onChange`.
 * Degrades to a placeholder when the Maps key is unconfigured (dev/CI) so callers
 * can mount it unconditionally.
 */
export function MapPicker({
  value,
  onChange,
  height = 260,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number;
}): JSX.Element {
  if (!isMapsConfigured) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-base border border-dashed border-neutral-300 bg-neutral-50 text-center"
        style={{ height }}
      >
        <MapPinned className="h-7 w-7 text-neutral-400" aria-hidden />
        <p className="max-w-xs text-tiny text-neutral-500">
          Peta belum dikonfigurasi. Masukkan lintang &amp; bujur secara manual.
        </p>
      </div>
    );
  }
  return (
    <APIProvider apiKey={MAPS_API_KEY as string}>
      <MapPickerInner value={value} onChange={onChange} height={height} />
    </APIProvider>
  );
}
