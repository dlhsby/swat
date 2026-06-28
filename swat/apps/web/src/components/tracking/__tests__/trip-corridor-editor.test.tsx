import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import { TripCorridorEditor } from '../trip-corridor-editor';

vi.mock('@/lib/google-maps', () => ({
  isMapsConfigured: true,
  MAPS_API_KEY: 'test-key',
  SURABAYA: { lat: -7.2575, lng: 112.7521 },
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  useMap: () => ({ addListener: () => ({ remove: () => undefined }) }),
  useMapsLibrary: () => undefined,
}));

const hooks = vi.hoisted(() => ({
  useTripGeometry: vi.fn(),
  useRouteCorridors: vi.fn(),
  setCorridor: { mutate: vi.fn(), isPending: false },
  saveOverride: { mutate: vi.fn(), isPending: false },
  removeOverride: { mutate: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/use-geometry', () => ({
  useTripGeometry: hooks.useTripGeometry,
  useSetTripCorridor: () => hooks.setCorridor,
  useSaveTripGeometry: () => hooks.saveOverride,
  useDeleteTripGeometry: () => hooks.removeOverride,
}));

vi.mock('@/hooks/use-corridors', () => ({
  useRouteCorridors: hooks.useRouteCorridors,
}));

const LINE = {
  type: 'LineString' as const,
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ] as [number, number][],
};
const DEFAULT_C = {
  id: 'c1',
  routeId: 'r1',
  name: 'Jalur Utama',
  isDefault: true,
  pathGeojson: LINE,
  waypoints: null,
  toleranceMeters: 150,
  lengthMeters: 1200,
  source: 'directions',
  createdAt: '',
  updatedAt: '',
};
const ALT_C = { ...DEFAULT_C, id: 'c2', name: 'Alternatif Tol', isDefault: false };

const TRIP = { id: 't1', label: 'Pool A → TPS 1 · 26 Jun' };

function tripGeom(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      tripId: 't1',
      routeId: 'r1',
      corridorId: null,
      corridorName: null,
      hasOverride: false,
      pathGeojson: null,
      waypoints: null,
      toleranceMeters: null,
      ...overrides,
    },
    isLoading: false,
  };
}

describe('TripCorridorEditor (per-day picker)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useTripGeometry.mockReturnValue(tripGeom());
    hooks.useRouteCorridors.mockReturnValue({ data: [DEFAULT_C, ALT_C], isLoading: false });
  });

  it("lists the trip route's corridors with the default badged", () => {
    renderWithProviders(<TripCorridorEditor trip={TRIP} onClose={() => undefined} />);
    expect(screen.getByText('Koridor harian')).toBeInTheDocument();
    expect(screen.getByText('Pool A → TPS 1 · 26 Jun')).toBeInTheDocument();
    expect(screen.getByText('Jalur Utama')).toBeInTheDocument();
    expect(screen.getByText('Alternatif Tol')).toBeInTheDocument();
  });

  it('applies an alternate corridor for the day by id', async () => {
    renderWithProviders(<TripCorridorEditor trip={TRIP} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: /Alternatif Tol/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(hooks.setCorridor.mutate).toHaveBeenCalledWith(
      { tripId: 't1', corridorId: 'c2' },
      expect.any(Object),
    );
  });

  it('clears the explicit corridor when the default is picked', async () => {
    hooks.useTripGeometry.mockReturnValue(
      tripGeom({ corridorId: 'c2', corridorName: 'Alternatif Tol' }),
    );
    renderWithProviders(<TripCorridorEditor trip={TRIP} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: /Jalur Utama/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(hooks.setCorridor.mutate).toHaveBeenCalledWith(
      { tripId: 't1', corridorId: '' },
      expect.any(Object),
    );
  });

  it('surfaces an active freehand override and clears it', async () => {
    hooks.useTripGeometry.mockReturnValue(
      tripGeom({ hasOverride: true, pathGeojson: LINE, toleranceMeters: 150 }),
    );
    renderWithProviders(<TripCorridorEditor trip={TRIP} onClose={() => undefined} />);
    expect(screen.getByText(/Koridor khusus hari ini sedang aktif/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hapus koridor khusus' }));
    expect(hooks.removeOverride.mutate).toHaveBeenCalledWith('t1');
  });

  it('renders nothing when no trip is selected', () => {
    renderWithProviders(<TripCorridorEditor trip={null} onClose={() => undefined} />);
    expect(screen.queryByText('Koridor harian')).not.toBeInTheDocument();
  });
});
