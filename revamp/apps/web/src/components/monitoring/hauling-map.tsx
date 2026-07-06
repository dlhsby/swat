'use client';

import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { LocateFixed, MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from '@/components/ui';
import { useMapsApiKey } from '@/hooks/use-maps-key';
import { type RouteMapSite } from '@/lib/monitoring-api';
import { type TrackPoint, type VehiclePosition } from '@/lib/tracking-api';

/** Surabaya city centre — the default view before bounds are fit to the data. */
const SURABAYA = { lat: -7.2575, lng: 112.7521 };

/** Marker fill for a vehicle by source + device status (Phase 7 vehicle layer). */
export function vehicleColor(v: VehiclePosition): string {
  if (v.source === 'recorded-activity') return '#d97706'; // amber — placed from activity
  return v.status === 'online' ? '#15803d' : '#9ca3af'; // green live / grey offline
}

/** Marker fill + single-letter glyph by site type, so each type reads as a
 * distinct icon (not just a colour) at a glance. */
const SITE_STYLE: Record<string, { color: string; letter: string; label: string }> = {
  TPA: { color: '#b91c1c', letter: 'A', label: 'TPA (Tempat Pemrosesan Akhir)' },
  TPS: { color: '#0f766e', letter: 'S', label: 'TPS (Tempat Penampungan Sementara)' },
  SPBU: { color: '#b45309', letter: 'B', label: 'SPBU' },
  POOL: { color: '#4338ca', letter: 'P', label: 'Pool' },
};

export function siteStyle(type: string): { color: string; letter: string; label: string } {
  return (
    SITE_STYLE[type] ?? { color: '#475569', letter: type.charAt(0).toUpperCase(), label: type }
  );
}

/**
 * Draws the site + vehicle markers imperatively via the Maps JS API. Using the
 * core `maps` library directly (rather than AdvancedMarker) keeps it working
 * without a cloud-side Map ID.
 */
function MapOverlays({
  sites,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  trail,
}: {
  sites: readonly RouteMapSite[];
  vehicles: readonly VehiclePosition[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  trail?: readonly TrackPoint[];
}): null {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // One shared InfoWindow, reused/repositioned per site click.
    const infoWindow = new google.maps.InfoWindow();

    const markers = sites.map((site) => {
      const style = siteStyle(site.type);
      const marker = new google.maps.Marker({
        position: { lat: site.latitude, lng: site.longitude },
        map,
        title: `${site.name} (${style.label})`,
        label: { text: style.letter, color: '#ffffff', fontWeight: '700', fontSize: '11px' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: style.color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => {
        infoWindow.setContent(
          `<div style="font:13px system-ui;padding:2px 0">` +
            `<strong>${site.name}</strong><br/>` +
            `${style.label}<br/>` +
            `<span style="color:#64748b">${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}</span>` +
            `</div>`,
        );
        infoWindow.open({ map, anchor: marker });
      });
      return marker;
    });

    // The selected vehicle's breadcrumb trail (Phase 7 drill-down) — drawn under
    // the markers so the vehicle dot stays on top.
    const trailLine =
      trail && trail.length > 1
        ? new google.maps.Polyline({
            map,
            path: trail.map((p) => ({ lat: p.latitude, lng: p.longitude })),
            strokeColor: '#1d4ed8',
            strokeOpacity: 0.9,
            strokeWeight: 3,
            zIndex: 500,
          })
        : null;

    // Vehicle layer (Phase 7): live-gps (green/grey) + recorded-activity (amber).
    // A directional arrow (not a plain dot) so vehicles never read as sites, even
    // colour-blind; rotated to heading when GPS reports one. A click selects the
    // vehicle (opens the detail drawer); the selected one is enlarged + ringed.
    const vehicleMarkers = vehicles.map((v) => {
      const selected = v.vehicleId === selectedVehicleId;
      const marker = new google.maps.Marker({
        position: { lat: v.latitude, lng: v.longitude },
        map,
        title:
          `${v.plate} — ` +
          (v.source === 'recorded-activity'
            ? (v.legLabel ?? 'aktivitas tercatat')
            : v.status === 'online'
              ? 'live'
              : 'offline'),
        zIndex: selected ? 2000 : 1000,
        cursor: onSelectVehicle ? 'pointer' : undefined,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: selected ? 7 : 5,
          rotation: v.heading ?? 0,
          fillColor: vehicleColor(v),
          fillOpacity: v.source === 'recorded-activity' ? 0.65 : 1,
          strokeColor: selected ? '#1d4ed8' : '#ffffff',
          strokeWeight: selected ? 3 : 2,
        },
      });
      if (onSelectVehicle) {
        marker.addListener('click', () => onSelectVehicle(v.vehicleId));
      }
      return marker;
    });

    // Only auto-fit when nothing is focused, so selecting a vehicle (which pans +
    // zooms in a separate effect) isn't yanked back on the next positions poll.
    if (!selectedVehicleId && (sites.length > 0 || vehicles.length > 0)) {
      const bounds = new google.maps.LatLngBounds();
      sites.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      vehicles.forEach((v) => bounds.extend({ lat: v.latitude, lng: v.longitude }));
      map.fitBounds(bounds, 48);
    }

    return () => {
      infoWindow.close();
      markers.forEach((m) => {
        google.maps.event.clearInstanceListeners(m);
        m.setMap(null);
      });
      vehicleMarkers.forEach((m) => {
        google.maps.event.clearInstanceListeners(m);
        m.setMap(null);
      });
      trailLine?.setMap(null);
    };
  }, [map, sites, vehicles, selectedVehicleId, onSelectVehicle, trail]);

  // Pan/zoom to the selected vehicle once when the selection changes.
  useEffect(() => {
    if (!map || !selectedVehicleId) return;
    const v = vehicles.find((x) => x.vehicleId === selectedVehicleId);
    if (v) {
      map.panTo({ lat: v.latitude, lng: v.longitude });
      map.setZoom(15);
    }
    // Intentionally only re-run on selection change, not on every positions poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedVehicleId]);

  return null;
}

/** The button content mounted into the native map control (its own React root). */
function CurrentLocationButtonContent({ map }: { map: google.maps.Map }): JSX.Element {
  const [locating, setLocating] = useState(false);

  const handleClick = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(15);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [map]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="m-[10px] shadow-subtle"
      aria-label="Gunakan lokasi saya"
      title="Gunakan lokasi saya"
      loading={locating}
      onClick={handleClick}
    >
      <LocateFixed className="h-4 w-4" aria-hidden />
    </Button>
  );
}

/**
 * "Use my location" as a NATIVE map control (pushed into `map.controls`, not an
 * absolutely-positioned overlay) so Google Maps stacks it with the zoom control
 * at the bottom-right instead of it overlapping the fullscreen control.
 */
function CurrentLocationControl(): null {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const controls = map.controls[google.maps.ControlPosition.RIGHT_BOTTOM];
    if (!controls) return;
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<CurrentLocationButtonContent map={map} />);
    const index = controls.push(container) - 1;
    return () => {
      controls.removeAt(index);
      root.unmount();
    };
  }, [map]);

  return null;
}

/** A centered notice card used for both the unconfigured and empty states. */
function MapNotice({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-base border border-dashed border-neutral-300 bg-neutral-50 text-center">
      <MapPinned className="h-8 w-8 text-neutral-400" aria-hidden />
      <p className="max-w-[24rem] text-body-sm text-neutral-500">{message}</p>
    </div>
  );
}

/**
 * Pengangkutan map: TPS/TPA/SPBU/pool site markers (each type its own icon +
 * click-to-view info) and the live/recorded vehicle layer. No route lines — sites
 * and vehicles are the point, not a drawn network. Falls back to a labeled
 * placeholder when no Google Maps API key is configured, so dev/CI without a key
 * still builds.
 */
export function HaulingMap({
  sites,
  loading,
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
  trail,
}: {
  sites: readonly RouteMapSite[];
  loading: boolean;
  vehicles?: readonly VehiclePosition[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  trail?: readonly TrackPoint[];
}): JSX.Element {
  const t = useTranslations('monitoring.hauling');
  const mapKey = useMapsApiKey();

  if (!mapKey) {
    return <MapNotice message={t('mapPlaceholder')} />;
  }
  if (!loading && sites.length === 0 && vehicles.length === 0) {
    return <MapNotice message={t('mapEmpty')} />;
  }

  return (
    <div className="h-[480px] overflow-hidden rounded-base">
      <APIProvider apiKey={mapKey}>
        <GoogleMap
          defaultCenter={SURABAYA}
          defaultZoom={11}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          streetViewControl={false}
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapOverlays
            sites={sites}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
            trail={trail}
          />
          <CurrentLocationControl />
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
