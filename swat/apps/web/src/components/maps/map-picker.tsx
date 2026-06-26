'use client';

import { APIProvider, Map as GoogleMap, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPinned, Search, Crosshair, LocateFixed } from 'lucide-react';
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
  readOnly = false,
}: {
  value: LatLng | null;
  onPick: (p: LatLng) => void;
  onMapReady: (map: google.maps.Map) => void;
  readOnly?: boolean;
}): null {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const centeredRef = useRef(false);

  useEffect(() => {
    if (map) onMapReady(map);
  }, [map, onMapReady]);

  // Click anywhere to (re)place the pin — disabled in read-only preview.
  useEffect(() => {
    if (!map || readOnly) return undefined;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onPick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => listener.remove();
  }, [map, onPick, readOnly]);

  // Marker mirrors `value`; created lazily, dragged updates flow back up.
  useEffect(() => {
    if (!map || typeof google === 'undefined') return undefined;
    if (!value) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return undefined;
    }
    if (!markerRef.current) {
      const marker = new google.maps.Marker({ map, position: value, draggable: !readOnly });
      if (!readOnly) {
        marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onPick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      }
      markerRef.current = marker;
    } else {
      markerRef.current.setPosition(value);
    }
    return undefined;
  }, [map, value, onPick, readOnly]);

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
  readOnly = false,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height: number;
  readOnly?: boolean;
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

  const [locating, setLocating] = useState(false);
  const useMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSearchError('Geolokasi tidak didukung di peramban ini.');
      return;
    }
    setLocating(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const picked = { lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) };
        onChange(picked);
        mapRef.current?.panTo(picked);
        mapRef.current?.setZoom(16);
        setLocating(false);
      },
      () => {
        setSearchError('Tidak bisa mengambil lokasi — izinkan akses lokasi peramban.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onChange]);

  return (
    <div className="space-y-2">
      {!readOnly ? (
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
          <Button
            type="button"
            variant="secondary"
            onClick={useMyLocation}
            loading={locating}
            aria-label="Gunakan lokasi saya"
            title="Gunakan lokasi saya"
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : null}
      {searchError ? <p className="text-tiny text-danger-600">{searchError}</p> : null}
      <div className="overflow-hidden rounded-base border border-neutral-200" style={{ height }}>
        <GoogleMap
          defaultCenter={value ?? SURABAYA}
          defaultZoom={value ? 15 : 12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
          // Drop the Street View "pegman" + map-type + fullscreen chrome — this is a
          // pin picker, not an explorer. Keep zoom + the my-location button below.
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <PinLayer value={value} onPick={onChange} onMapReady={onMapReady} readOnly={readOnly} />
        </GoogleMap>
      </div>
      {!readOnly ? (
        <p className="flex items-center gap-1.5 text-tiny text-neutral-500">
          <Crosshair className="h-3.5 w-3.5" aria-hidden />
          Klik peta atau seret pin untuk menetapkan titik.
        </p>
      ) : null}
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
  readOnly = false,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number;
  /** Preview mode: show the pin but disable search, my-location, click + drag. */
  readOnly?: boolean;
}): JSX.Element {
  if (!isMapsConfigured) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-base border border-dashed border-neutral-300 bg-neutral-50 text-center"
        style={{ height }}
      >
        <MapPinned className="h-7 w-7 text-neutral-400" aria-hidden />
        <p className="max-w-xs text-tiny text-neutral-500">
          {readOnly
            ? 'Peta belum dikonfigurasi.'
            : 'Peta belum dikonfigurasi. Masukkan lintang & bujur secara manual.'}
        </p>
      </div>
    );
  }
  return (
    <APIProvider apiKey={MAPS_API_KEY as string}>
      <MapPickerInner value={value} onChange={onChange} height={height} readOnly={readOnly} />
    </APIProvider>
  );
}
