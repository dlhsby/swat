import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';

import { RouteCorridorEditor } from '../route-corridor-editor';

// Force the map "configured" path and stub the Google Maps wrapper.
vi.mock('@/lib/google-maps', () => ({
  isMapsConfigured: true,
  MAPS_API_KEY: 'test-key',
  SURABAYA: { lat: -7.2575, lng: 112.7521 },
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  useMap: () => ({ addListener: () => ({ remove: () => undefined }) }),
  // No routes library in jsdom → snap falls back to straight segments (no google calls).
  useMapsLibrary: () => undefined,
}));

const hooks = vi.hoisted(() => ({
  useRouteGeometry: vi.fn(),
  save: { mutate: vi.fn(), isPending: false },
  remove: { mutate: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/use-geometry', () => ({
  useRouteGeometry: hooks.useRouteGeometry,
  useSaveRouteGeometry: () => hooks.save,
  useDeleteRouteGeometry: () => hooks.remove,
}));

const ROUTE = { id: 'r1', originSiteName: 'Pool A', destinationSiteName: 'TPA Benowo' };
const LINE = {
  type: 'LineString' as const,
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ] as [number, number][],
};

describe('RouteCorridorEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useRouteGeometry.mockReturnValue({ data: null, isLoading: false });
  });

  it('renders the route label + draw hint when open', () => {
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    expect(screen.getByText('Koridor Rute')).toBeInTheDocument();
    expect(screen.getByText('Pool A → TPA Benowo')).toBeInTheDocument();
    expect(screen.getByText(/Klik peta untuk menjatuhkan titik/)).toBeInTheDocument();
    // Snap-to-road toggle is on by default.
    expect(screen.getByRole('switch') as HTMLInputElement).toBeChecked();
  });

  it('disables Save with fewer than 2 points (empty corridor)', () => {
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    expect(screen.getByText('0 titik')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Koridor/ })).toBeDisabled();
    // No existing geometry → no delete action.
    expect(screen.queryByRole('button', { name: /Hapus Koridor/ })).not.toBeInTheDocument();
  });

  it('hydrates from an existing template: Save enabled + Delete shown', async () => {
    hooks.useRouteGeometry.mockReturnValue({
      data: {
        routeId: 'r1',
        pathGeojson: LINE,
        waypoints: null,
        toleranceMeters: 200,
        lengthMeters: 1200,
        source: 'google-maps',
        updatedAt: '',
      },
      isLoading: false,
    });
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    // Path builds asynchronously (straight, no routes lib) → 2 control points.
    expect(await screen.findByText('2 titik')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Simpan Koridor/ })).toBeEnabled(),
    );
    expect(screen.getByRole('button', { name: /Hapus Koridor/ })).toBeInTheDocument();
    expect((screen.getByLabelText('Toleransi (meter)') as HTMLInputElement).value).toBe('200');
  });

  it('saves the drawn corridor as a GeoJSON LineString with waypoints', async () => {
    hooks.useRouteGeometry.mockReturnValue({
      data: {
        routeId: 'r1',
        pathGeojson: LINE,
        waypoints: null,
        toleranceMeters: 150,
        lengthMeters: 1,
        source: 'google-maps',
        updatedAt: '',
      },
      isLoading: false,
    });
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    const saveBtn = await screen.findByRole('button', { name: /Simpan Koridor/ });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await userEvent.click(saveBtn);
    expect(hooks.save.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: 'r1',
        pathGeojson: expect.objectContaining({ type: 'LineString' }),
        waypoints: expect.arrayContaining([
          expect.objectContaining({ snapped: expect.any(Boolean) }),
        ]),
        toleranceMeters: 150,
      }),
      expect.any(Object),
    );
  });

  it('calls onClose from Cancel', async () => {
    const onClose = vi.fn();
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when no route is selected', () => {
    renderWithProviders(<RouteCorridorEditor route={null} onClose={() => undefined} />);
    expect(screen.queryByText('Koridor Rute')).not.toBeInTheDocument();
  });
});
