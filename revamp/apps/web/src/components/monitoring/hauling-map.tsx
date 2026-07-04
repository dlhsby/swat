'use client';

import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useMapsApiKey } from '@/hooks/use-maps-key';
import { type RouteMapEdge, type RouteMapSite } from '@/lib/monitoring-api';
import { type TrackPoint, type VehiclePosition } from '@/lib/tracking-api';

/** Surabaya city centre — the default view before bounds are fit to the data. */
const SURABAYA = { lat: -7.2575, lng: 112.7521 };

/** Marker fill for a vehicle by source + device status (Phase 7 vehicle layer). */
function vehicleColor(v: VehiclePosition): string {
  if (v.source === 'recorded-activity') return '#d97706'; // amber — placed from activity
  return v.status === 'online' ? '#15803d' : '#9ca3af'; // green live / grey offline
}

/** Marker fill by site type (TPS pickup vs TPA disposal vs pool/other). */
function markerColor(type: string): string {
  if (type === 'TPA') return '#b91c1c'; // danger-700
  if (type === 'TPS') return '#0f766e'; // primary-700
  return '#475569'; // neutral
}

/**
 * Draws the markers + route polylines imperatively via the Maps JS API. Using the
 * core `maps` library directly (rather than AdvancedMarker) keeps it working
 * without a cloud-side Map ID, and lets us scale polyline weight by trip volume.
 */
function MapOverlays({
  sites,
  edges,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  trail,
}: {
  sites: readonly RouteMapSite[];
  edges: readonly RouteMapEdge[];
  vehicles: readonly VehiclePosition[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  trail?: readonly TrackPoint[];
}): null {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const byId = new Map<string, RouteMapSite>(sites.map((s) => [s.id, s]));
    const maxTrips = edges.reduce((max, e) => Math.max(max, e.tripCount), 1);

    const markers = sites.map(
      (site) =>
        new google.maps.Marker({
          position: { lat: site.latitude, lng: site.longitude },
          map,
          title: `${site.name} (${site.type})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: markerColor(site.type),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        }),
    );

    const lines = edges.flatMap((edge) => {
      const origin = byId.get(edge.originSiteId);
      const destination = byId.get(edge.destinationSiteId);
      if (!origin || !destination) return [];
      return [
        new google.maps.Polyline({
          map,
          path: [
            { lat: origin.latitude, lng: origin.longitude },
            { lat: destination.latitude, lng: destination.longitude },
          ],
          strokeColor: '#0f766e',
          strokeOpacity: 0.7,
          strokeWeight: 1 + Math.round((edge.tripCount / maxTrips) * 5),
        }),
      ];
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
    // A click selects the vehicle (opens the detail drawer); the selected one is
    // enlarged + ringed.
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
          path: google.maps.SymbolPath.CIRCLE,
          scale: selected ? 10 : 7,
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
      markers.forEach((m) => m.setMap(null));
      lines.forEach((l) => l.setMap(null));
      vehicleMarkers.forEach((m) => {
        google.maps.event.clearInstanceListeners(m);
        m.setMap(null);
      });
      trailLine?.setMap(null);
    };
  }, [map, sites, edges, vehicles, selectedVehicleId, onSelectVehicle, trail]);

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
 * Pengangkutan map: TPS/TPA/pool markers + origin→destination route polylines for
 * the active routes in the selected range. Falls back to a labeled placeholder
 * when no Google Maps API key is configured, so dev/CI without a key still builds.
 */
export function HaulingMap({
  sites,
  edges,
  loading,
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
  trail,
}: {
  sites: readonly RouteMapSite[];
  edges: readonly RouteMapEdge[];
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
          style={{ width: '100%', height: '100%' }}
        >
          <MapOverlays
            sites={sites}
            edges={edges}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
            trail={trail}
          />
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
