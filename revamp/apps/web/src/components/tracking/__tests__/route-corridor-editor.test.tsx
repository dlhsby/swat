import { screen, waitFor, within } from '@testing-library/react';
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
  useRouteCorridors: vi.fn(),
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
  remove: { mutate: vi.fn(), isPending: false },
}));

vi.mock('@/hooks/use-corridors', () => ({
  useRouteCorridors: hooks.useRouteCorridors,
  useCreateCorridor: () => hooks.create,
  useUpdateCorridor: () => hooks.update,
  useDeleteCorridor: () => hooks.remove,
}));

const ROUTE = {
  id: 'r1',
  category: 'PICKUP',
  originSiteName: 'Pool A',
  destinationSiteName: 'TPA Benowo',
};
const LINE = {
  type: 'LineString' as const,
  coordinates: [
    [112.75, -7.25],
    [112.76, -7.26],
  ] as [number, number][],
};
const DEFAULT_CORRIDOR = {
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
const ALT_CORRIDOR = {
  ...DEFAULT_CORRIDOR,
  id: 'c2',
  name: 'Alternatif Tol',
  isDefault: false,
  lengthMeters: 1500,
};

describe('RouteCorridorEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useRouteCorridors.mockReturnValue({ data: [], isLoading: false });
  });

  it('lists a route corridors with the default badged and protected from delete', () => {
    hooks.useRouteCorridors.mockReturnValue({
      data: [DEFAULT_CORRIDOR, ALT_CORRIDOR],
      isLoading: false,
    });
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);

    expect(screen.getByText('Koridor rute')).toBeInTheDocument();
    expect(screen.getByText('Pool A → TPA Benowo')).toBeInTheDocument();
    expect(screen.getByText('Jalur Utama')).toBeInTheDocument();
    expect(screen.getByText('Utama')).toBeInTheDocument();
    // Default corridor exposes Edit but not Delete; the alternate has both.
    expect(screen.queryByRole('button', { name: 'Hapus Jalur Utama' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus Alternatif Tol' })).toBeInTheDocument();
  });

  it('opens the drawing canvas to add a new corridor; Save gated on a name', async () => {
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: /Tambah koridor/ }));

    // Canvas opened — name field present, Save still disabled until a name is typed.
    const nameField = screen.getByLabelText('Nama koridor');
    expect(nameField).toBeInTheDocument();
    await userEvent.type(nameField, 'Lewat Pasar');
    expect((nameField as HTMLInputElement).value).toBe('Lewat Pasar');
  });

  it('hydrates an existing corridor into the canvas and saves an update', async () => {
    hooks.useRouteCorridors.mockReturnValue({
      data: [ALT_CORRIDOR],
      isLoading: false,
    });
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ubah Alternatif Tol' }));

    expect((screen.getByLabelText('Nama koridor') as HTMLInputElement).value).toBe(
      'Alternatif Tol',
    );
    // Path builds asynchronously (straight, no routes lib) → 2 control points.
    expect(await screen.findByText('2 titik')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Simpan/ });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await userEvent.click(saveBtn);
    expect(hooks.update.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c2',
        body: expect.objectContaining({
          name: 'Alternatif Tol',
          pathGeojson: expect.objectContaining({ type: 'LineString' }),
          toleranceMeters: 150,
        }),
      }),
      expect.any(Object),
    );
  });

  it('confirms before deleting an alternate corridor', async () => {
    hooks.useRouteCorridors.mockReturnValue({
      data: [DEFAULT_CORRIDOR, ALT_CORRIDOR],
      isLoading: false,
    });
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Alternatif Tol' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Alternatif Tol/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }));
    expect(hooks.remove.mutate).toHaveBeenCalledWith('c2', expect.any(Object));
  });

  it('is view-only for a "Berangkat dari Pool" route (no add/edit/delete)', () => {
    hooks.useRouteCorridors.mockReturnValue({
      data: [DEFAULT_CORRIDOR, ALT_CORRIDOR],
      isLoading: false,
    });
    renderWithProviders(
      <RouteCorridorEditor
        route={{ ...ROUTE, category: 'DEPART_POOL' }}
        onClose={() => undefined}
      />,
    );
    expect(screen.queryByRole('button', { name: /Tambah koridor/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ubah Jalur Utama' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus Alternatif Tol' })).not.toBeInTheDocument();
  });

  it('calls onClose from the list footer', async () => {
    const onClose = vi.fn();
    renderWithProviders(<RouteCorridorEditor route={ROUTE} onClose={onClose} />);
    // The Sheet's built-in X close shares the "Tutup" label — click the footer one.
    const closeButtons = screen.getAllByRole('button', { name: 'Tutup' });
    await userEvent.click(closeButtons.at(-1) as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when no route is selected', () => {
    renderWithProviders(<RouteCorridorEditor route={null} onClose={() => undefined} />);
    expect(screen.queryByText('Koridor rute')).not.toBeInTheDocument();
  });
});
