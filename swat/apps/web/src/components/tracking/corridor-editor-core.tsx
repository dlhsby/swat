'use client';

import { APIProvider, Map as GoogleMap, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPinned, Undo2, Trash2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { round6 } from '@/components/maps/map-picker';
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
  Switch,
} from '@/components/ui';
import { type CorridorWaypoint, type GeoJsonLineString } from '@/lib/geometry-api';
import { isMapsConfigured, MAPS_API_KEY, SURABAYA } from '@/lib/google-maps';

type LatLng = google.maps.LatLngLiteral;

/** The corridor a target already has, in editor terms. `waypoints` may be null
 *  (e.g. Trip overrides don't persist control points) → seed from the path. */
export interface CorridorData {
  readonly pathGeojson: GeoJsonLineString;
  readonly waypoints: CorridorWaypoint[] | null;
  readonly toleranceMeters: number;
}

export interface SaveCorridorPayload {
  readonly pathGeojson: GeoJsonLineString;
  readonly waypoints: CorridorWaypoint[];
  readonly toleranceMeters: number;
}

/** Build state pushed up from the canvas after each road-route computation. */
interface BuildResult {
  readonly path: LatLng[];
  readonly building: boolean;
  readonly warning: boolean;
}

const toLatLng = (w: CorridorWaypoint): LatLng => ({ lat: w.lat, lng: w.lng });

/**
 * Drawing layer: renders the (road-snapped) corridor polyline plus a numbered,
 * draggable handle per control node. Clicking the map appends a node; dragging a
 * handle moves it. Mirrors the hauling-map pattern (core `google.maps`, no Map ID).
 */
function CorridorDrawing({
  path,
  nodes,
  onAddPoint,
  onMovePoint,
}: {
  path: readonly LatLng[];
  nodes: readonly CorridorWaypoint[];
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
      path: path as LatLng[],
      strokeColor: '#0f766e',
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
    const markers = nodes.map((node, index) => {
      const marker = new google.maps.Marker({
        position: toLatLng(node),
        map,
        draggable: true,
        label: { text: String(index + 1), color: '#ffffff', fontSize: '11px' },
        // Freehand handles read differently from snapped ones.
        opacity: node.snapped ? 1 : 0.75,
      });
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onMovePoint(index, { lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      return marker;
    });

    if (!fittedRef.current && path.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 64);
      fittedRef.current = true;
    }

    return () => {
      polyline.setMap(null);
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, path, nodes, onMovePoint]);

  return null;
}

/**
 * Map canvas + road-routing engine. Recomputes the dense corridor path whenever the
 * control nodes change: each segment whose END node is `snapped` is routed along
 * roads via Google Directions; a freehand (or failed) segment is a straight line.
 */
function CorridorCanvas({
  nodes,
  path,
  onBuilt,
  onAddPoint,
  onMovePoint,
}: {
  nodes: readonly CorridorWaypoint[];
  path: readonly LatLng[];
  onBuilt: (result: BuildResult) => void;
  onAddPoint: (p: LatLng) => void;
  onMovePoint: (index: number, p: LatLng) => void;
}): JSX.Element {
  const routesLib = useMapsLibrary('routes');
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);

  useEffect(() => {
    if (routesLib) serviceRef.current = new routesLib.DirectionsService();
  }, [routesLib]);

  useEffect(() => {
    let cancelled = false;
    const build = async (): Promise<void> => {
      if (nodes.length < 2) {
        onBuilt({ path: nodes.map(toLatLng), building: false, warning: false });
        return;
      }
      // Show the straight skeleton immediately while road routes compute.
      onBuilt({ path: nodes.map(toLatLng), building: true, warning: false });
      const service = serviceRef.current;
      const out: LatLng[] = [];
      let warning = false;
      let prev: CorridorWaypoint | undefined;
      for (const node of nodes) {
        if (!prev) {
          out.push(toLatLng(node));
          prev = node;
          continue;
        }
        let routed = false;
        if (node.snapped && service) {
          try {
            const res = await service.route({
              origin: toLatLng(prev),
              destination: toLatLng(node),
              travelMode: google.maps.TravelMode.DRIVING,
            });
            const overview = res.routes[0]?.overview_path ?? [];
            if (overview.length > 0) {
              // Skip the first vertex — it duplicates `prev`, already in `out`.
              overview.slice(1).forEach((pt) => out.push({ lat: pt.lat(), lng: pt.lng() }));
              routed = true;
            }
          } catch {
            routed = false;
          }
          if (!routed) warning = true;
        }
        if (!routed) out.push(toLatLng(node));
        prev = node;
      }
      if (!cancelled) onBuilt({ path: out, building: false, warning });
    };
    void build();
    return () => {
      cancelled = true;
    };
  }, [nodes, routesLib, onBuilt]);

  return (
    <div className="h-[360px] overflow-hidden rounded-base border border-neutral-200">
      <GoogleMap
        defaultCenter={SURABAYA}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        streetViewControl={false}
        fullscreenControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <CorridorDrawing
          path={path}
          nodes={nodes}
          onAddPoint={onAddPoint}
          onMovePoint={onMovePoint}
        />
      </GoogleMap>
    </div>
  );
}

/**
 * Shared corridor editor (Phase 7). A slide-out sheet to draw/edit a corridor on
 * Google Maps — drop ordered control points; in "snap" mode each new segment
 * auto-follows roads (Google Directions), dragging a handle re-routes, and a
 * freehand toggle allows straight off-road segments. The dense road-snapped line is
 * what deviation detection uses. Used by both the Route-template editor and the
 * per-day Trip-override editor via thin wrappers that supply the data + mutations.
 * Degrades to a placeholder when the Maps key is unconfigured. Gated upstream by
 * `route-geometry:manage`.
 */
export function CorridorEditorCore({
  open,
  entityKey,
  subtitle,
  existing,
  isLoading,
  saving,
  removing,
  hasExisting,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  /** Changes per opened target so the canvas remounts + re-fits bounds. */
  entityKey: string;
  subtitle: string;
  existing: CorridorData | null;
  isLoading: boolean;
  saving: boolean;
  removing: boolean;
  hasExisting: boolean;
  onSave: (payload: SaveCorridorPayload) => void;
  onDelete: () => void;
  onClose: () => void;
}): JSX.Element {
  const t = useTranslations('corridor');

  const [nodes, setNodes] = useState<CorridorWaypoint[]>([]);
  const [path, setPath] = useState<LatLng[]>([]);
  const [tolerance, setTolerance] = useState<number>(150);
  const [building, setBuilding] = useState(false);
  const [warning, setWarning] = useState(false);

  // Snap mode for newly dropped points; a ref keeps the click handler stable.
  const [snapMode, setSnapMode] = useState(true);
  const snapModeRef = useRef(true);
  useEffect(() => {
    snapModeRef.current = snapMode;
  }, [snapMode]);

  // Hydrate when a target opens (or its saved geometry arrives). Prefer the saved
  // control points; fall back to the dense path as freehand nodes for corridors
  // without persisted waypoints (shape preserved exactly).
  useEffect(() => {
    if (!open) return;
    if (existing?.waypoints && existing.waypoints.length > 0) {
      setNodes(existing.waypoints.map((w) => ({ lng: w.lng, lat: w.lat, snapped: w.snapped })));
      setTolerance(existing.toleranceMeters);
    } else if (existing?.pathGeojson) {
      setNodes(
        existing.pathGeojson.coordinates.map(([lng, lat]) => ({ lng, lat, snapped: false })),
      );
      setTolerance(existing.toleranceMeters);
    } else {
      setNodes([]);
      setTolerance(150);
    }
  }, [open, existing]);

  const onBuilt = useCallback((result: BuildResult) => {
    setPath(result.path);
    setBuilding(result.building);
    setWarning(result.warning);
  }, []);

  const addPoint = useCallback(
    (p: LatLng) =>
      setNodes((prev) => [
        ...prev,
        { lng: round6(p.lng), lat: round6(p.lat), snapped: snapModeRef.current },
      ]),
    [],
  );
  const movePoint = useCallback(
    (index: number, p: LatLng) =>
      setNodes((prev) =>
        prev.map((node, i) =>
          i === index ? { ...node, lng: round6(p.lng), lat: round6(p.lat) } : node,
        ),
      ),
    [],
  );
  const undo = useCallback(() => setNodes((prev) => prev.slice(0, -1)), []);
  const clear = useCallback(() => setNodes([]), []);

  const handleSave = (): void => {
    if (path.length < 2) return;
    const pathGeojson: GeoJsonLineString = {
      type: 'LineString',
      coordinates: path.map((p) => [round6(p.lng), round6(p.lat)]),
    };
    onSave({ pathGeojson, waypoints: nodes, toleranceMeters: tolerance });
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[640px]">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
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

              <div className="flex items-center justify-between gap-3 rounded-base border border-neutral-200 px-3 py-2">
                <div>
                  <Label htmlFor="corridor-snap">{t('snapToggle')}</Label>
                  <p className="text-tiny text-neutral-500">{t('snapHint')}</p>
                </div>
                <Switch id="corridor-snap" checked={snapMode} onCheckedChange={setSnapMode} />
              </div>

              {/* Keyed by target so the fit-bounds runs once per opened corridor. */}
              <APIProvider apiKey={MAPS_API_KEY as string}>
                <CorridorCanvas
                  key={entityKey}
                  nodes={nodes}
                  path={path}
                  onBuilt={onBuilt}
                  onAddPoint={addPoint}
                  onMovePoint={movePoint}
                />
              </APIProvider>

              {building ? (
                <p className="flex items-center gap-1.5 text-tiny text-neutral-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {t('building')}
                </p>
              ) : null}
              {warning ? <p className="text-tiny text-amber-600">{t('snapWarning')}</p> : null}

              <div className="flex items-center justify-between gap-2">
                <span className="text-body-sm text-neutral-600">
                  {t('pointCount', { count: nodes.length })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={undo}
                    disabled={nodes.length === 0}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden /> {t('undo')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clear}
                    disabled={nodes.length === 0}
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
          {hasExisting ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger-600"
              onClick={onDelete}
              loading={removing}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> {t('delete')}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!isMapsConfigured || isLoading || building || path.length < 2}
          >
            {t('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
