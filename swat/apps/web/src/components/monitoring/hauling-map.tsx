'use client';

import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { type RouteMapEdge, type RouteMapSite } from '@/lib/monitoring-api';

/** Surabaya city centre — the default view before bounds are fit to the data. */
const SURABAYA = { lat: -7.2575, lng: 112.7521 };
const MAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
}: {
  sites: readonly RouteMapSite[];
  edges: readonly RouteMapEdge[];
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

    if (sites.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      sites.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      map.fitBounds(bounds, 48);
    }

    return () => {
      markers.forEach((m) => m.setMap(null));
      lines.forEach((l) => l.setMap(null));
    };
  }, [map, sites, edges]);

  return null;
}

/** A centered notice card used for both the unconfigured and empty states. */
function MapNotice({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-base border border-dashed border-neutral-300 bg-neutral-50 text-center">
      <MapPinned className="h-8 w-8 text-neutral-400" aria-hidden />
      <p className="max-w-sm text-body-sm text-neutral-500">{message}</p>
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
}: {
  sites: readonly RouteMapSite[];
  edges: readonly RouteMapEdge[];
  loading: boolean;
}): JSX.Element {
  const t = useTranslations('monitoring.hauling');

  if (!MAP_KEY) {
    return <MapNotice message={t('mapPlaceholder')} />;
  }
  if (!loading && sites.length === 0) {
    return <MapNotice message={t('mapEmpty')} />;
  }

  return (
    <div className="h-[480px] overflow-hidden rounded-base">
      <APIProvider apiKey={MAP_KEY}>
        <GoogleMap
          defaultCenter={SURABAYA}
          defaultZoom={11}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapOverlays sites={sites} edges={edges} />
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
