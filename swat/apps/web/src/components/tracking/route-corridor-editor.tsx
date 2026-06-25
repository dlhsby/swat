'use client';

import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MapPinned, Undo2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui';
import {
  useDeleteRouteGeometry,
  useRouteGeometry,
  useSaveRouteGeometry,
} from '@/hooks/use-geometry';
import { type GeoJsonLineString } from '@/lib/geometry-api';
import { isMapsConfigured, MAPS_API_KEY, SURABAYA } from '@/lib/google-maps';

export interface CorridorRoute {
  readonly id: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
}

type LatLng = google.maps.LatLngLiteral;

/**
 * Imperative drawing layer: click the map to append a corridor vertex, drag a
 * marker to move it. Mirrors the hauling-map pattern (core `google.maps` API, no
 * Map ID needed). Fits bounds ONCE when an existing corridor first loads.
 */
function CorridorDrawing({
  points,
  onAddPoint,
  onMovePoint,
}: {
  points: readonly LatLng[];
  onAddPoint: (p: LatLng) => void;
  onMovePoint: (index: number, p: LatLng) => void;
}): null {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!map) return undefined;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onAddPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => listener.remove();
  }, [map, onAddPoint]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return undefined;
    const polyline = new google.maps.Polyline({
      map,
      path: points as LatLng[],
      strokeColor: '#0f766e',
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
    const markers = points.map((position, index) => {
      const marker = new google.maps.Marker({
        position,
        map,
        draggable: true,
        label: { text: String(index + 1), color: '#ffffff', fontSize: '11px' },
      });
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onMovePoint(index, { lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      return marker;
    });

    if (!fittedRef.current && points.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 64);
      fittedRef.current = true;
    }

    return () => {
      polyline.setMap(null);
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, points, onMovePoint]);

  return null;
}

/**
 * Route corridor editor (Phase 7, T-710). A slide-out sheet to draw/edit a route's
 * corridor on Google Maps, set its tolerance (buffer width), and save it as the
 * route template (or clear it). Opens when `route` is set. Degrades to a
 * placeholder when the Maps key is unconfigured (dev/CI). Gated upstream by
 * `route-geometry:manage`.
 */
export function RouteCorridorEditor({
  route,
  onClose,
}: {
  route: CorridorRoute | null;
  onClose: () => void;
}): JSX.Element {
  const t = useTranslations('corridor');
  const open = route !== null;
  const { data: existing, isLoading } = useRouteGeometry(route?.id ?? null);
  const save = useSaveRouteGeometry();
  const remove = useDeleteRouteGeometry();

  const [points, setPoints] = useState<LatLng[]>([]);
  const [tolerance, setTolerance] = useState<number>(150);

  // Hydrate from the loaded template each time a route opens / its data arrives.
  useEffect(() => {
    if (!open) return;
    if (existing?.pathGeojson) {
      setPoints(existing.pathGeojson.coordinates.map(([lng, lat]) => ({ lat, lng })));
      setTolerance(existing.toleranceMeters);
    } else {
      setPoints([]);
      setTolerance(150);
    }
  }, [open, existing]);

  const addPoint = useCallback((p: LatLng) => setPoints((prev) => [...prev, p]), []);
  const movePoint = useCallback(
    (index: number, p: LatLng) =>
      setPoints((prev) => prev.map((existingPoint, i) => (i === index ? p : existingPoint))),
    [],
  );
  const undo = useCallback(() => setPoints((prev) => prev.slice(0, -1)), []);
  const clear = useCallback(() => setPoints([]), []);

  const handleSave = (): void => {
    if (!route || points.length < 2) return;
    const pathGeojson: GeoJsonLineString = {
      type: 'LineString',
      coordinates: points.map((p) => [p.lng, p.lat]),
    };
    save.mutate(
      { routeId: route.id, pathGeojson, toleranceMeters: tolerance },
      { onSuccess: onClose },
    );
  };

  const handleDelete = (): void => {
    if (!route) return;
    remove.mutate(route.id, { onSuccess: onClose });
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[640px]">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>
            {route ? `${route.originSiteName} → ${route.destinationSiteName}` : ''}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {!isMapsConfigured ? (
            <div className="flex h-[360px] flex-col items-center justify-center gap-3 rounded-base border border-dashed border-neutral-300 bg-neutral-50 text-center">
              <MapPinned className="h-8 w-8 text-neutral-400" aria-hidden />
              <p className="max-w-sm text-body-sm text-neutral-500">{t('mapPlaceholder')}</p>
            </div>
          ) : (
            <>
              <p className="text-body-sm text-neutral-500">{t('drawHint')}</p>
              <div className="h-[360px] overflow-hidden rounded-base border border-neutral-200">
                <APIProvider apiKey={MAPS_API_KEY as string}>
                  <GoogleMap
                    defaultCenter={SURABAYA}
                    defaultZoom={12}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    clickableIcons={false}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <CorridorDrawing
                      points={points}
                      onAddPoint={addPoint}
                      onMovePoint={movePoint}
                    />
                  </GoogleMap>
                </APIProvider>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-body-sm text-neutral-600">
                  {t('pointCount', { count: points.length })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={undo}
                    disabled={points.length === 0}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden /> {t('undo')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clear}
                    disabled={points.length === 0}
                  >
                    {t('clear')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="corridor-tolerance">{t('tolerance')}</Label>
                <Input
                  id="corridor-tolerance"
                  type="number"
                  min={10}
                  max={2000}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                />
                <p className="text-tiny text-neutral-500">{t('toleranceHint')}</p>
              </div>
            </>
          )}
        </SheetBody>

        <SheetFooter>
          {existing ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger-600"
              onClick={handleDelete}
              loading={remove.isPending}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> {t('delete')}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={save.isPending}
            disabled={!isMapsConfigured || isLoading || points.length < 2}
          >
            {t('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
